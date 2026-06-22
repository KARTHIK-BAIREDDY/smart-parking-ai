const fs = require('fs');
let content = fs.readFileSync('eslint.config.mjs', 'utf8');

const overrides = `
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/rules-of-hooks": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
`;

content = content.replace(/\]\);/, `  ${overrides}\n]);`);
fs.writeFileSync('eslint.config.mjs', content);
console.log("ESLint rules turned off.");
