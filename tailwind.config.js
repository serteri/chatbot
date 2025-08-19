/** @type {import('tailwindcss').Config} */
module.exports = {
    // v4'te content belirtmek şart değil ama biz yine de sınırları tanımlayalım
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: { extend: {} },
    plugins: [require("daisyui")],
    daisyui: {
        themes: ["light", "dark"],
        darkTheme: "dark",
    },
    safelist: [
        "btn","btn-primary","btn-outline","btn-error","btn-ghost","btn-circle","btn-sm",
        "input","input-bordered","textarea","select",
        "dropdown","dropdown-end","menu","menu-sm","avatar","badge","divider",
        "w-10","rounded-full","skeleton","mt-3","z-[1]","p-2","shadow","rounded-box","w-52",
    ],
};