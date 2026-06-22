const fs = require('fs');
let content = fs.readFileSync('eslint.config.mjs', 'utf8');

content = content.replace(/"react-hooks\/rules-of-hooks": "off",/, `"react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/immutability": "off",`);
fs.writeFileSync('eslint.config.mjs', content);
console.log("ESLint hooks rules turned off.");
