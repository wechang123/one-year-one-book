import tsParser from "@typescript-eslint/parser";

const NO_AMBIENT_TIME =
  "현재 시각은 lib/now.ts의 getNow()로만 가져온다. 앱의 '지금'은 상수다.";

export default [
  { ignores: ["generated/**", ".next/**", "node_modules/**", "prisma/migrations/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tsParser, ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // new Date() — 인자 없는 호출만 막는다. new Date("2026-05-27")은 허용.
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: NO_AMBIENT_TIME,
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: NO_AMBIENT_TIME,
        },
      ],
    },
  },
];
