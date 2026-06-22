"use client";

import { Camera, CheckCircle2, Loader2, Play, Square, AlertCircle, Activity, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { preprocessImage, executeOCR } from "@/lib/ocr-helpers";

export default function EntryCameraPage() {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [tfModel, setTfModel] = useState<any>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  
  const [parkingPlaces, setParkingPlaces] = useState<any[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");

  const [telemetry, setTelemetry] = useState<{
    status: string;
    vehicleType?: string;
    plateNumber?: string;
    ocrConfidence?: number;
    plateConfidence?: number;
    vehicleConfidence?: number;
    mlServiceOnline?: boolean;
    assignedSlot?: string;
    sessionId?: string;
    isError?: boolean;
    debugLogs?: string[];
    ocrResults?: { name: string; text: string; rawText: string; confidence: number }[];
    frameHistory?: {text: string, confidence: number}[];
    previews?: { src: string; name: string }[];
    boxes?: { 
      vehicle: number[]; 
      initialPlateROI?: number[]; 
      refinedPlateROI?: number[]; 
      candidateROIs?: number[][];
      deskewAngle?: number; 
      scaleX: number; 
      scaleY: number; 
    };
  }>({ status: "Waiting for camera..." });

  const [showDebug, setShowDebug] = useState(true);

  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Fetch places
    fetch("/api/parking")
      .then(res => res.json())
      .then(data => {
        setParkingPlaces(data);
        if (data.length > 0) setSelectedPlaceId(data[0].id);
      })
      .catch(console.error);

    // Load Coco SSD
    const loadModel = async () => {
      try {
        require("@tensorflow/tfjs-backend-cpu");
        require("@tensorflow/tfjs-core");
        const cocoSsd = require("@tensorflow-models/coco-ssd");
        const model = await cocoSsd.load({ modelUrl: '/models/coco-ssd/model.json' });
        setTfModel(model);
        setTelemetry({ status: "AI Model Ready. Select Parking Place & Start." });
      } catch (err) {
        console.error("FAILED to load local AI model:", err);
        setTelemetry({ status: "Failed to load local AI model.", isError: true });
      } finally {
        setLoadingModel(false);
      }
    };
    loadModel();
  }, []);

  // Heartbeat
  useEffect(() => {
    if (!isCameraActive || !selectedPlaceId) return;
    const interval = setInterval(() => {
      fetch("/api/cameras/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraId: "entry-cam-1",
          cameraType: "entry",
          parkingPlaceId: selectedPlaceId
        })
      }).catch(console.error);
    }, 10000);
    return () => clearInterval(interval);
  }, [isCameraActive, selectedPlaceId]);

  // performOCR replaced by lib/ocr-helpers runMultiPassOCR

  const runDetection = useCallback(async () => {
    if (!isCameraActive || !webcamRef.current || !tfModel || isProcessingRef.current) return;
    if (!selectedPlaceId) {
      setTelemetry(prev => ({ ...prev, status: "Please select a Parking Place", isError: true }));
      setIsCameraActive(false);
      return;
    }
    
    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return;

    isProcessingRef.current = true;

    try {
      const predictions = await tfModel.detect(video);
      const validTypes = ["car", "truck", "bus", "motorcycle"];
      const vehicle = predictions.find((p: any) => validTypes.includes(p.class) && p.score >= 0.70);
      
      if (vehicle) {
        const [vx, vy, vw, vh] = vehicle.bbox;
        const scaleX = video.clientWidth / video.videoWidth;
        const scaleY = video.clientHeight / video.videoHeight;

        setTelemetry(prev => ({
          ...prev,
          status: "Vehicle Detected! Reading Plate...",
          isError: false,
          vehicleType: vehicle.class.toUpperCase(),
          boxes: { vehicle: [vx, vy, vw, vh], scaleX, scaleY }
        }));

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
           isProcessingRef.current = false;
           return;
        }

        try {
          const { passes, originalCrop, plateCrop, plateRectLog, telemetry: ocrTelemetry } = await preprocessImage(
            imageSrc, 
            vehicle.bbox, 
            { width: video.videoWidth, height: video.videoHeight },
            vehicle.class
          );

          const boxesObj = {
            vehicle: vehicle.bbox,
            initialPlateROI: ocrTelemetry.initialPlateROI,
            refinedPlateROI: ocrTelemetry.refinedPlateROI,
            candidateROIs: ocrTelemetry.candidateROIs,
            deskewAngle: ocrTelemetry.deskewAngle,
            scaleX: scaleX,
            scaleY: scaleY
          };

          setTelemetry(prev => ({ 
            ...prev, status: "OCR Processing...", isError: false, 
            vehicleConfidence: Math.round(vehicle.score * 100),
            plateConfidence: ocrTelemetry.yoloConfidence ? Math.round(ocrTelemetry.yoloConfidence * 100) : undefined,
            boxes: boxesObj
          }));

          if (!ocrTelemetry.refinedPlateROI) {
            setTelemetry(prev => ({ 
              ...prev, status: "Localization Failed", isError: true, debugLogs: [plateRectLog, "No localized plate found"],
              previews: [{ src: imageSrc, name: "Full Frame" }, originalCrop], boxes: boxesObj
            }));
            isProcessingRef.current = false;
            return;
          }

          const [rx, ry, rw, rh] = ocrTelemetry.refinedPlateROI;
          if (rw < 120 || rh < 30) {
            setTelemetry(prev => ({
              ...prev, status: `Rejecting OCR: Crop too small (${Math.round(rw)}x${Math.round(rh)})`, isError: true, boxes: boxesObj
            }));
            isProcessingRef.current = false;
            return;
          }

          const debugLog = [plateRectLog];
          const executeOcrResult = await executeOCR(passes, debugLog);
          const bestResult = executeOcrResult?.bestResult;
          const allResults = executeOcrResult?.allResults || [];
          
          if (!bestResult || !bestResult.text || bestResult.confidence < 30) {
             const reason = !bestResult ? "OCR completely failed" : `Confidence too low (${Math.round(bestResult.confidence)}%)`;
             
             fetch('/api/debug/save-failure', {
               method: 'POST',
               body: JSON.stringify({
                  originalFrame: imageSrc,
                  vehicleCrop: originalCrop.src,
                  roiCrop: passes.find(p => p.name === "Original")?.src || originalCrop.src,
                  localizedCrop: plateCrop.src,
                  text: bestResult?.text || "",
                  confidence: bestResult?.confidence || 0,
                  vehicleType: vehicle.class,
                  reason: reason
               })
             }).catch(console.error);

             setTelemetry(prev => ({ 
               ...prev, status: reason, isError: true, debugLogs: debugLog,
               previews: [{ src: imageSrc, name: "Full Frame" }, originalCrop, plateCrop, passes.find(p => p.name === "Localized Plate") || plateCrop],
               boxes: boxesObj, ocrResults: allResults
             }));
             isProcessingRef.current = false;
             return;
          }

          const finalConfirmedText = bestResult.text.replace(/[^A-Z0-9]/g, "").toUpperCase();

          setTelemetry(prev => ({ 
             ...prev, status: "Validating with Backend...", plateNumber: finalConfirmedText, ocrConfidence: Math.round(bestResult.confidence),
             debugLogs: debugLog, previews: [{ src: imageSrc, name: "Full Frame" }, originalCrop, plateCrop, passes.find(p => p.name === "Localized Plate") || plateCrop],
             boxes: boxesObj, ocrResults: allResults
          }));

          const payload = {
            cameraId: "entry-cam-1",
            vehicleId: finalConfirmedText, 
            confidence: Math.round(bestResult.confidence),
            placeId: selectedPlaceId,
            imagePath: imageSrc,
            vehicleType: vehicle.class.charAt(0).toUpperCase() + vehicle.class.slice(1)
          };
          
          const res = await fetch("/api/slots/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          
          if (res.ok) {
              if (data.action === "debounced") {
                 isProcessingRef.current = false;
                 return;
              }
              
              setTelemetry(prev => ({
                ...prev,
                status: "Allocated Slot: " + data.slotId,
                vehicleType: vehicle.class.toUpperCase(),
                plateNumber: data.vehicleNumber,
                ocrConfidence: Math.round(bestResult.confidence),
                assignedSlot: data.slotId,
                sessionId: data.sessionId,
                isError: false,
                boxes: boxesObj,
                previews: [{ src: imageSrc, name: "Full Frame" }, originalCrop, plateCrop, passes.find(p => p.name === "Localized Plate") || plateCrop],
                debugLogs: debugLog,
                ocrResults: allResults
              }));
              
              await new Promise(r => setTimeout(r, 4000));
          } else {
              fetch('/api/debug/save-failure', {
                method: 'POST',
                body: JSON.stringify({
                   originalFrame: imageSrc, vehicleCrop: originalCrop.src, roiCrop: passes.find(p => p.name === "Original")?.src || originalCrop.src,
                   localizedCrop: plateCrop.src, text: finalConfirmedText, confidence: Math.round(bestResult.confidence), vehicleType: vehicle.class, reason: data.error || "Backend Validation Failed"
                })
              }).catch(console.error);

              setTelemetry(prev => ({ ...prev, status: `Rejected: ${data.error}`, isError: true, assignedSlot: "N/A", sessionId: "N/A" }));
              await new Promise(r => setTimeout(r, 2000));
          }
        } catch (e: any) {
          console.error("OCR PROCESSING ERROR:", e);
          setTelemetry(prev => ({ ...prev, status: "Model failed to load", isError: true }));
        }
      } else {
        setTelemetry(prev => {
          if (prev.status.includes("Monitoring")) return prev;
          return {
            status: "Monitoring... No vehicle found",
            vehicleType: "-", plateNumber: "-", ocrConfidence: 0, assignedSlot: "-", sessionId: "-", isError: false, boxes: undefined
          };
        });
      }
    } catch (e: any) {
      console.error("FULL DETECTION FAILURE:", e);
      setTelemetry(prev => ({ ...prev, status: `ERROR: ${e.message}`, isError: true }));
    } finally {
      isProcessingRef.current = false;
    }
  }, [isCameraActive, tfModel, selectedPlaceId]);

  useEffect(() => {
    let interval: any;
    if (isCameraActive) {
      interval = setInterval(() => {
        runDetection();
      }, 1000);
    } else {
      setTelemetry(prev => ({ ...prev, status: "Camera Stopped." }));
    }
    return () => clearInterval(interval);
  }, [isCameraActive, runDetection]);

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Camera className="w-8 h-8 text-cyan-400" /> Dedicated Entry Camera
        </h1>
        <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">← Dashboard</Link>
      </div>

      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
         <Settings className="w-5 h-5 text-gray-400" />
         <label className="text-sm font-bold text-gray-300">Parking Location:</label>
         <select 
            value={selectedPlaceId}
            onChange={(e) => setSelectedPlaceId(e.target.value)}
            disabled={isCameraActive}
            className="bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white"
         >
            <option value="" disabled>Select a location</option>
            {parkingPlaces.map(p => (
               <option key={p.id} value={p.id}>{p.name || p.id}</option>
            ))}
         </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full relative">
          <div className="w-full flex justify-between items-center mb-4 z-10 relative">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" /> Live Feed
            </h2>
            <div className="flex gap-2">
              <button
                disabled={loadingModel || !selectedPlaceId}
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
                  loadingModel || !selectedPlaceId ? "bg-slate-700 text-slate-400 cursor-not-allowed" :
                  isCameraActive ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                }`}
              >
                {loadingModel ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading AI...</> :
                 isCameraActive ? <><Square className="w-4 h-4" /> Stop Scan</> : <><Play className="w-4 h-4" /> Start Scan</>}
              </button>
            </div>
          </div>

          <div className="flex-1 w-full bg-black rounded-xl overflow-hidden relative flex items-center justify-center border-2 border-slate-800">
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {telemetry.mlServiceOnline !== undefined && (
                <div className={`px-3 py-1.5 rounded-full shadow-lg text-sm font-medium border backdrop-blur-md flex items-center gap-2 ${
                  telemetry.mlServiceOnline ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${telemetry.mlServiceOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  ML ANPR: {telemetry.mlServiceOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              )}
              <div className={`px-3 py-1.5 rounded-full shadow-lg text-sm font-medium border backdrop-blur-md flex items-center gap-2 ${
                isCameraActive ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-700 border-zinc-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isCameraActive ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                {isCameraActive ? 'Camera Active' : 'Camera Paused'}
              </div>
            </div>

            {!isCameraActive && (
              <p className="text-slate-500 flex items-center gap-2"><Camera /> Camera is inactive</p>
            )}
            
            {isCameraActive && (
              <Webcam
                audio={false}
                muted={true}
                playsInline={true}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
                onUserMediaError={(err) => {
                  setTelemetry(prev => ({ ...prev, status: "Camera Error: Permission Denied or Unavailable", isError: true }));
                  setIsCameraActive(false);
                }}
              />
            )}
            
            {/* Bounding Boxes */}
            {telemetry.boxes && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Vehicle Box (Yellow) */}
                <div 
                  className="absolute border-2 border-yellow-400 bg-yellow-400/10 transition-all duration-300"
                  style={{
                    left: `${telemetry.boxes.vehicle[0] * telemetry.boxes.scaleX}px`,
                    top: `${telemetry.boxes.vehicle[1] * telemetry.boxes.scaleY}px`,
                    width: `${telemetry.boxes.vehicle[2] * telemetry.boxes.scaleX}px`,
                    height: `${telemetry.boxes.vehicle[3] * telemetry.boxes.scaleY}px`,
                  }}
                />
                {/* Plate Box (Green) */}
                {telemetry.boxes.refinedPlateROI && (
                  <div 
                    className="absolute border-2 border-green-400 bg-green-400/20 transition-all duration-300 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                    style={{
                      left: `${telemetry.boxes.refinedPlateROI[0] * telemetry.boxes.scaleX}px`,
                      top: `${telemetry.boxes.refinedPlateROI[1] * telemetry.boxes.scaleY}px`,
                      width: `${telemetry.boxes.refinedPlateROI[2] * telemetry.boxes.scaleX}px`,
                      height: `${telemetry.boxes.refinedPlateROI[3] * telemetry.boxes.scaleY}px`,
                    }}
                  >
                    {telemetry.plateConfidence !== undefined && (
                      <span className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                        Plate {telemetry.plateConfidence}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {telemetry.previews && telemetry.previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              {telemetry.previews.map((preview, i) => (
                <div key={i} className="bg-slate-950 p-2 rounded flex flex-col items-center border border-slate-800">
                  <span className="text-[10px] text-cyan-400 font-bold mb-2 uppercase tracking-wider text-center">{preview.name}</span>
                  <img 
                    src={preview.src} 
                    alt={preview.name} 
                    className="w-full object-contain bg-black rounded" 
                    style={{ maxHeight: "120px" }} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6">Live Telemetry</h2>
          
          <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 transition-colors ${
            telemetry.isError ? "bg-red-900/30 text-red-400 border border-red-800/50" : 
            telemetry.status.includes("Allocated") ? "bg-green-900/30 text-green-400 border border-green-800/50" :
            "bg-cyan-900/20 text-cyan-400 border border-cyan-800/50"
          }`}>
            {telemetry.isError ? <AlertCircle className="w-6 h-6 shrink-0" /> : 
             telemetry.status.includes("Allocated") ? <CheckCircle2 className="w-6 h-6 shrink-0" /> :
             <Loader2 className="w-6 h-6 shrink-0 animate-spin" />}
            <p className="font-bold text-lg">{telemetry.status}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vehicle Match</p>
              <p className="text-white font-mono text-xl">{telemetry.vehicleType || "-"}</p>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">OCR Confidence</p>
              <p className={`font-mono text-xl ${telemetry.ocrConfidence && telemetry.ocrConfidence < 80 ? 'text-amber-400' : 'text-white'}`}>
                 {telemetry.ocrConfidence ? `${telemetry.ocrConfidence}%` : "-"}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Plate Detection Confidence</p>
              <p className={`font-mono text-xl ${telemetry.plateConfidence && telemetry.plateConfidence < 70 ? 'text-amber-400' : 'text-green-400'}`}>
                 {telemetry.plateConfidence ? `${telemetry.plateConfidence}%` : (telemetry.boxes?.candidateROIs && telemetry.boxes.candidateROIs.length > 0 ? 'FALLBACK ACTIVATED' : '-')}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Extracted Plate</p>
              <p className="text-amber-400 font-mono text-2xl tracking-widest">{telemetry.plateNumber || "-"}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assigned Slot</p>
              <p className="text-green-400 font-bold text-2xl">{telemetry.assignedSlot || "-"}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Session ID</p>
              <p className="text-cyan-400 font-mono text-sm truncate" title={telemetry.sessionId}>{telemetry.sessionId || "-"}</p>
            </div>
          </div>

          <div className="mt-auto pt-6 text-center text-xs text-slate-500">
            Strict Vehicle & Plate Matching Enforced
          </div>
        </div>
      </div>
      
      {/* Debug Logs & OCR Results Section */}
      {showDebug && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Localization Candidates Panel */}
          {telemetry.boxes?.candidateROIs && telemetry.boxes.candidateROIs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> Localization Ranks
              </h3>
              <div className="flex flex-col gap-3">
                {telemetry.boxes.candidateROIs.map((cand, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${i === 0 ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-bold uppercase ${i === 0 ? 'text-green-400' : 'text-blue-400'}`}>
                        Candidate #{i+1} {i === 0 && "(WINNER)"}
                      </span>
                      <span className="font-mono text-sm text-white">
                        {(cand[4]*100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OCR Results Panel */}
          {telemetry.ocrResults && telemetry.ocrResults.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-white font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> OCR Pass Results
              </h3>
              <div className="flex flex-col gap-3">
                {telemetry.ocrResults.map((res, i) => {
                  const isWinner = res.text === telemetry.plateNumber && Math.round(res.confidence) === telemetry.ocrConfidence;
                  return (
                    <div key={i} className={`p-3 rounded-lg border ${isWinner ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold uppercase ${isWinner ? 'text-green-400' : 'text-slate-400'}`}>
                          {res.name} {isWinner && "(WINNER)"}
                        </span>
                        <span className={`font-mono text-sm ${res.confidence >= 60 ? 'text-green-400' : res.confidence >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {Math.round(res.confidence)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white font-mono">{res.text || "-"}</span>
                        <span className="text-slate-500 text-xs" title="Raw extracted text">raw: {res.rawText || "-"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Text Logs Panel */}
          {telemetry.debugLogs && telemetry.debugLogs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 font-mono text-xs text-green-400">
              <h3 className="text-white font-bold mb-4 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4" /> System Logs
              </h3>
              <div className="flex flex-col gap-1 h-64 overflow-y-auto pr-2">
                {telemetry.debugLogs.map((log, i) => (
                  <div key={i} className="border-b border-slate-800/50 pb-1 mb-1">{">"} {log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
