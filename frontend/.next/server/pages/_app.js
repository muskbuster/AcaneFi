/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./lib/wallet.ts":
/*!***********************!*\
  !*** ./lib/wallet.ts ***!
  \***********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   chains: () => (/* binding */ chains),\n/* harmony export */   config: () => (/* binding */ config)\n/* harmony export */ });\n/* harmony import */ var _rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @rainbow-me/rainbowkit */ \"@rainbow-me/rainbowkit\");\n/* harmony import */ var wagmi_chains__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! wagmi/chains */ \"wagmi/chains\");\n/* harmony import */ var viem__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! viem */ \"viem\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_0__, wagmi_chains__WEBPACK_IMPORTED_MODULE_1__, viem__WEBPACK_IMPORTED_MODULE_2__]);\n([_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_0__, wagmi_chains__WEBPACK_IMPORTED_MODULE_1__, viem__WEBPACK_IMPORTED_MODULE_2__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n// Custom chain definitions using viem\nconst rariTestnet = (0,viem__WEBPACK_IMPORTED_MODULE_2__.defineChain)({\n    id: 1918988905,\n    name: \"Rari Testnet\",\n    network: \"rari-testnet\",\n    nativeCurrency: {\n        decimals: 18,\n        name: \"Ether\",\n        symbol: \"ETH\"\n    },\n    rpcUrls: {\n        default: {\n            http: [\n                \"https://rari-testnet.calderachain.xyz/http\"\n            ]\n        },\n        public: {\n            http: [\n                \"https://rari-testnet.calderachain.xyz/http\"\n            ]\n        }\n    },\n    blockExplorers: {\n        default: {\n            name: \"Rari Explorer\",\n            url: \"https://rari-testnet.calderachain.xyz\"\n        }\n    },\n    testnet: true\n});\nconst arcTestnet = (0,viem__WEBPACK_IMPORTED_MODULE_2__.defineChain)({\n    id: 5042002,\n    name: \"Arc Testnet\",\n    network: \"arc-testnet\",\n    nativeCurrency: {\n        decimals: 18,\n        name: \"Ether\",\n        symbol: \"ETH\"\n    },\n    rpcUrls: {\n        default: {\n            http: [\n                \"https://rpc.testnet.arc.network\"\n            ]\n        },\n        public: {\n            http: [\n                \"https://rpc.testnet.arc.network\"\n            ]\n        }\n    },\n    blockExplorers: {\n        default: {\n            name: \"Arc Explorer\",\n            url: \"https://explorer.testnet.arc.network\"\n        }\n    },\n    testnet: true\n});\n// Configure chains for ArcaneFi\nconst chains = [\n    wagmi_chains__WEBPACK_IMPORTED_MODULE_1__.sepolia,\n    wagmi_chains__WEBPACK_IMPORTED_MODULE_1__.baseSepolia,\n    rariTestnet,\n    arcTestnet\n];\n// Use getDefaultConfig from RainbowKit - automatically includes MetaMask and other wallets\nconst projectId =  false || \"wallet-connect\";\nconst config = (0,_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_0__.getDefaultConfig)({\n    appName: \"ArcaneFi\",\n    projectId,\n    chains,\n    ssr: true\n});\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9saWIvd2FsbGV0LnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQTBEO0FBQ047QUFDakI7QUFHbkMsc0NBQXNDO0FBQ3RDLE1BQU1JLGNBQWNELGlEQUFXQSxDQUFDO0lBQzlCRSxJQUFJO0lBQ0pDLE1BQU07SUFDTkMsU0FBUztJQUNUQyxnQkFBZ0I7UUFDZEMsVUFBVTtRQUNWSCxNQUFNO1FBQ05JLFFBQVE7SUFDVjtJQUNBQyxTQUFTO1FBQ1BDLFNBQVM7WUFDUEMsTUFBTTtnQkFBQzthQUE2QztRQUN0RDtRQUNBQyxRQUFRO1lBQ05ELE1BQU07Z0JBQUM7YUFBNkM7UUFDdEQ7SUFDRjtJQUNBRSxnQkFBZ0I7UUFDZEgsU0FBUztZQUNQTixNQUFNO1lBQ05VLEtBQUs7UUFDUDtJQUNGO0lBQ0FDLFNBQVM7QUFDWDtBQUVBLE1BQU1DLGFBQWFmLGlEQUFXQSxDQUFDO0lBQzdCRSxJQUFJO0lBQ0pDLE1BQU07SUFDTkMsU0FBUztJQUNUQyxnQkFBZ0I7UUFDZEMsVUFBVTtRQUNWSCxNQUFNO1FBQ05JLFFBQVE7SUFDVjtJQUNBQyxTQUFTO1FBQ1BDLFNBQVM7WUFDUEMsTUFBTTtnQkFBQzthQUFrQztRQUMzQztRQUNBQyxRQUFRO1lBQ05ELE1BQU07Z0JBQUM7YUFBa0M7UUFDM0M7SUFDRjtJQUNBRSxnQkFBZ0I7UUFDZEgsU0FBUztZQUNQTixNQUFNO1lBQ05VLEtBQUs7UUFDUDtJQUNGO0lBQ0FDLFNBQVM7QUFDWDtBQUVBLGdDQUFnQztBQUN6QixNQUFNRSxTQUFTO0lBQUNsQixpREFBT0E7SUFBRUMscURBQVdBO0lBQUVFO0lBQWFjO0NBQVcsQ0FBVTtBQUUvRSwyRkFBMkY7QUFDM0YsTUFBTUUsWUFBWUMsTUFBZ0QsSUFBSTtBQUUvRCxNQUFNRyxTQUFTeEIsd0VBQWdCQSxDQUFDO0lBQ3JDeUIsU0FBUztJQUNUTDtJQUNBRDtJQUNBTyxLQUFLO0FBQ1AsR0FBYSIsInNvdXJjZXMiOlsid2VicGFjazovL2FyY2FuZWZpLWZyb250ZW5kLy4vbGliL3dhbGxldC50cz9lYWUzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldERlZmF1bHRDb25maWcgfSBmcm9tICdAcmFpbmJvdy1tZS9yYWluYm93a2l0JztcbmltcG9ydCB7IHNlcG9saWEsIGJhc2VTZXBvbGlhIH0gZnJvbSAnd2FnbWkvY2hhaW5zJztcbmltcG9ydCB7IGRlZmluZUNoYWluIH0gZnJvbSAndmllbSc7XG5pbXBvcnQgdHlwZSB7IENvbmZpZyB9IGZyb20gJ3dhZ21pJztcblxuLy8gQ3VzdG9tIGNoYWluIGRlZmluaXRpb25zIHVzaW5nIHZpZW1cbmNvbnN0IHJhcmlUZXN0bmV0ID0gZGVmaW5lQ2hhaW4oe1xuICBpZDogMTkxODk4ODkwNSxcbiAgbmFtZTogJ1JhcmkgVGVzdG5ldCcsXG4gIG5ldHdvcms6ICdyYXJpLXRlc3RuZXQnLFxuICBuYXRpdmVDdXJyZW5jeToge1xuICAgIGRlY2ltYWxzOiAxOCxcbiAgICBuYW1lOiAnRXRoZXInLFxuICAgIHN5bWJvbDogJ0VUSCcsXG4gIH0sXG4gIHJwY1VybHM6IHtcbiAgICBkZWZhdWx0OiB7XG4gICAgICBodHRwOiBbJ2h0dHBzOi8vcmFyaS10ZXN0bmV0LmNhbGRlcmFjaGFpbi54eXovaHR0cCddLFxuICAgIH0sXG4gICAgcHVibGljOiB7XG4gICAgICBodHRwOiBbJ2h0dHBzOi8vcmFyaS10ZXN0bmV0LmNhbGRlcmFjaGFpbi54eXovaHR0cCddLFxuICAgIH0sXG4gIH0sXG4gIGJsb2NrRXhwbG9yZXJzOiB7XG4gICAgZGVmYXVsdDoge1xuICAgICAgbmFtZTogJ1JhcmkgRXhwbG9yZXInLFxuICAgICAgdXJsOiAnaHR0cHM6Ly9yYXJpLXRlc3RuZXQuY2FsZGVyYWNoYWluLnh5eicsXG4gICAgfSxcbiAgfSxcbiAgdGVzdG5ldDogdHJ1ZSxcbn0pO1xuXG5jb25zdCBhcmNUZXN0bmV0ID0gZGVmaW5lQ2hhaW4oe1xuICBpZDogNTA0MjAwMixcbiAgbmFtZTogJ0FyYyBUZXN0bmV0JyxcbiAgbmV0d29yazogJ2FyYy10ZXN0bmV0JyxcbiAgbmF0aXZlQ3VycmVuY3k6IHtcbiAgICBkZWNpbWFsczogMTgsXG4gICAgbmFtZTogJ0V0aGVyJyxcbiAgICBzeW1ib2w6ICdFVEgnLFxuICB9LFxuICBycGNVcmxzOiB7XG4gICAgZGVmYXVsdDoge1xuICAgICAgaHR0cDogWydodHRwczovL3JwYy50ZXN0bmV0LmFyYy5uZXR3b3JrJ10sXG4gICAgfSxcbiAgICBwdWJsaWM6IHtcbiAgICAgIGh0dHA6IFsnaHR0cHM6Ly9ycGMudGVzdG5ldC5hcmMubmV0d29yayddLFxuICAgIH0sXG4gIH0sXG4gIGJsb2NrRXhwbG9yZXJzOiB7XG4gICAgZGVmYXVsdDoge1xuICAgICAgbmFtZTogJ0FyYyBFeHBsb3JlcicsXG4gICAgICB1cmw6ICdodHRwczovL2V4cGxvcmVyLnRlc3RuZXQuYXJjLm5ldHdvcmsnLFxuICAgIH0sXG4gIH0sXG4gIHRlc3RuZXQ6IHRydWUsXG59KTtcblxuLy8gQ29uZmlndXJlIGNoYWlucyBmb3IgQXJjYW5lRmlcbmV4cG9ydCBjb25zdCBjaGFpbnMgPSBbc2Vwb2xpYSwgYmFzZVNlcG9saWEsIHJhcmlUZXN0bmV0LCBhcmNUZXN0bmV0XSBhcyBjb25zdDtcblxuLy8gVXNlIGdldERlZmF1bHRDb25maWcgZnJvbSBSYWluYm93S2l0IC0gYXV0b21hdGljYWxseSBpbmNsdWRlcyBNZXRhTWFzayBhbmQgb3RoZXIgd2FsbGV0c1xuY29uc3QgcHJvamVjdElkID0gcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfV0FMTEVUQ09OTkVDVF9QUk9KRUNUX0lEIHx8ICd3YWxsZXQtY29ubmVjdCc7XG5cbmV4cG9ydCBjb25zdCBjb25maWcgPSBnZXREZWZhdWx0Q29uZmlnKHtcbiAgYXBwTmFtZTogJ0FyY2FuZUZpJyxcbiAgcHJvamVjdElkLFxuICBjaGFpbnMsXG4gIHNzcjogdHJ1ZSxcbn0pIGFzIENvbmZpZztcblxuIl0sIm5hbWVzIjpbImdldERlZmF1bHRDb25maWciLCJzZXBvbGlhIiwiYmFzZVNlcG9saWEiLCJkZWZpbmVDaGFpbiIsInJhcmlUZXN0bmV0IiwiaWQiLCJuYW1lIiwibmV0d29yayIsIm5hdGl2ZUN1cnJlbmN5IiwiZGVjaW1hbHMiLCJzeW1ib2wiLCJycGNVcmxzIiwiZGVmYXVsdCIsImh0dHAiLCJwdWJsaWMiLCJibG9ja0V4cGxvcmVycyIsInVybCIsInRlc3RuZXQiLCJhcmNUZXN0bmV0IiwiY2hhaW5zIiwicHJvamVjdElkIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX1dBTExFVENPTk5FQ1RfUFJPSkVDVF9JRCIsImNvbmZpZyIsImFwcE5hbWUiLCJzc3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./lib/wallet.ts\n");

/***/ }),

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_Space_Grotesk_arguments_variable_font_heading_subsets_latin_display_swap_weight_400_500_600_700_variableName_spaceGrotesk___WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! next/font/google/target.css?{\"path\":\"pages/_app.tsx\",\"import\":\"Space_Grotesk\",\"arguments\":[{\"variable\":\"--font-heading\",\"subsets\":[\"latin\"],\"display\":\"swap\",\"weight\":[\"400\",\"500\",\"600\",\"700\"]}],\"variableName\":\"spaceGrotesk\"} */ \"../node_modules/next/font/google/target.css?{\\\"path\\\":\\\"pages/_app.tsx\\\",\\\"import\\\":\\\"Space_Grotesk\\\",\\\"arguments\\\":[{\\\"variable\\\":\\\"--font-heading\\\",\\\"subsets\\\":[\\\"latin\\\"],\\\"display\\\":\\\"swap\\\",\\\"weight\\\":[\\\"400\\\",\\\"500\\\",\\\"600\\\",\\\"700\\\"]}],\\\"variableName\\\":\\\"spaceGrotesk\\\"}\");\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_Space_Grotesk_arguments_variable_font_heading_subsets_latin_display_swap_weight_400_500_600_700_variableName_spaceGrotesk___WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(next_font_google_target_css_path_pages_app_tsx_import_Space_Grotesk_arguments_variable_font_heading_subsets_latin_display_swap_weight_400_500_600_700_variableName_spaceGrotesk___WEBPACK_IMPORTED_MODULE_8__);\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_Inter_arguments_variable_font_body_subsets_latin_display_swap_variableName_inter___WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! next/font/google/target.css?{\"path\":\"pages/_app.tsx\",\"import\":\"Inter\",\"arguments\":[{\"variable\":\"--font-body\",\"subsets\":[\"latin\"],\"display\":\"swap\"}],\"variableName\":\"inter\"} */ \"../node_modules/next/font/google/target.css?{\\\"path\\\":\\\"pages/_app.tsx\\\",\\\"import\\\":\\\"Inter\\\",\\\"arguments\\\":[{\\\"variable\\\":\\\"--font-body\\\",\\\"subsets\\\":[\\\"latin\\\"],\\\"display\\\":\\\"swap\\\"}],\\\"variableName\\\":\\\"inter\\\"}\");\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_Inter_arguments_variable_font_body_subsets_latin_display_swap_variableName_inter___WEBPACK_IMPORTED_MODULE_9___default = /*#__PURE__*/__webpack_require__.n(next_font_google_target_css_path_pages_app_tsx_import_Inter_arguments_variable_font_body_subsets_latin_display_swap_variableName_inter___WEBPACK_IMPORTED_MODULE_9__);\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_JetBrains_Mono_arguments_variable_font_mono_subsets_latin_display_swap_weight_400_500_variableName_jetBrainsMono___WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! next/font/google/target.css?{\"path\":\"pages/_app.tsx\",\"import\":\"JetBrains_Mono\",\"arguments\":[{\"variable\":\"--font-mono\",\"subsets\":[\"latin\"],\"display\":\"swap\",\"weight\":[\"400\",\"500\"]}],\"variableName\":\"jetBrainsMono\"} */ \"../node_modules/next/font/google/target.css?{\\\"path\\\":\\\"pages/_app.tsx\\\",\\\"import\\\":\\\"JetBrains_Mono\\\",\\\"arguments\\\":[{\\\"variable\\\":\\\"--font-mono\\\",\\\"subsets\\\":[\\\"latin\\\"],\\\"display\\\":\\\"swap\\\",\\\"weight\\\":[\\\"400\\\",\\\"500\\\"]}],\\\"variableName\\\":\\\"jetBrainsMono\\\"}\");\n/* harmony import */ var next_font_google_target_css_path_pages_app_tsx_import_JetBrains_Mono_arguments_variable_font_mono_subsets_latin_display_swap_weight_400_500_variableName_jetBrainsMono___WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(next_font_google_target_css_path_pages_app_tsx_import_JetBrains_Mono_arguments_variable_font_mono_subsets_latin_display_swap_weight_400_500_variableName_jetBrainsMono___WEBPACK_IMPORTED_MODULE_10__);\n/* harmony import */ var wagmi__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! wagmi */ \"wagmi\");\n/* harmony import */ var _tanstack_react_query__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @tanstack/react-query */ \"@tanstack/react-query\");\n/* harmony import */ var _rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @rainbow-me/rainbowkit */ \"@rainbow-me/rainbowkit\");\n/* harmony import */ var wagmi_chains__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! wagmi/chains */ \"wagmi/chains\");\n/* harmony import */ var _lib_wallet__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../lib/wallet */ \"./lib/wallet.ts\");\n/* harmony import */ var _rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @rainbow-me/rainbowkit/styles.css */ \"../node_modules/@rainbow-me/rainbowkit/dist/index.css\");\n/* harmony import */ var _rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_rainbow_me_rainbowkit_styles_css__WEBPACK_IMPORTED_MODULE_6__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_7__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([wagmi__WEBPACK_IMPORTED_MODULE_1__, _tanstack_react_query__WEBPACK_IMPORTED_MODULE_2__, _rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_3__, wagmi_chains__WEBPACK_IMPORTED_MODULE_4__, _lib_wallet__WEBPACK_IMPORTED_MODULE_5__]);\n([wagmi__WEBPACK_IMPORTED_MODULE_1__, _tanstack_react_query__WEBPACK_IMPORTED_MODULE_2__, _rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_3__, wagmi_chains__WEBPACK_IMPORTED_MODULE_4__, _lib_wallet__WEBPACK_IMPORTED_MODULE_5__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\n\n\n\n\n\nconst queryClient = new _tanstack_react_query__WEBPACK_IMPORTED_MODULE_2__.QueryClient();\nfunction App({ Component, pageProps }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: `${(next_font_google_target_css_path_pages_app_tsx_import_Space_Grotesk_arguments_variable_font_heading_subsets_latin_display_swap_weight_400_500_600_700_variableName_spaceGrotesk___WEBPACK_IMPORTED_MODULE_8___default().variable)} ${(next_font_google_target_css_path_pages_app_tsx_import_Inter_arguments_variable_font_body_subsets_latin_display_swap_variableName_inter___WEBPACK_IMPORTED_MODULE_9___default().variable)} ${(next_font_google_target_css_path_pages_app_tsx_import_JetBrains_Mono_arguments_variable_font_mono_subsets_latin_display_swap_weight_400_500_variableName_jetBrainsMono___WEBPACK_IMPORTED_MODULE_10___default().variable)} font-body`,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(wagmi__WEBPACK_IMPORTED_MODULE_1__.WagmiProvider, {\n            config: _lib_wallet__WEBPACK_IMPORTED_MODULE_5__.config,\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_tanstack_react_query__WEBPACK_IMPORTED_MODULE_2__.QueryClientProvider, {\n                client: queryClient,\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_rainbow_me_rainbowkit__WEBPACK_IMPORTED_MODULE_3__.RainbowKitProvider, {\n                    modalSize: \"compact\",\n                    initialChain: wagmi_chains__WEBPACK_IMPORTED_MODULE_4__.baseSepolia,\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                        ...pageProps\n                    }, void 0, false, {\n                        fileName: \"/Users/sudeepskamat/arcanefi/frontend/pages/_app.tsx\",\n                        lineNumber: 42,\n                        columnNumber: 13\n                    }, this)\n                }, void 0, false, {\n                    fileName: \"/Users/sudeepskamat/arcanefi/frontend/pages/_app.tsx\",\n                    lineNumber: 38,\n                    columnNumber: 11\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/sudeepskamat/arcanefi/frontend/pages/_app.tsx\",\n                lineNumber: 37,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"/Users/sudeepskamat/arcanefi/frontend/pages/_app.tsx\",\n            lineNumber: 36,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/sudeepskamat/arcanefi/frontend/pages/_app.tsx\",\n        lineNumber: 35,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBVU1BO0FBT0FDO0FBTUFDO0FBdEJnQztBQUNtQztBQUNiO0FBQ2pCO0FBRUo7QUFDSTtBQUNaO0FBc0IvQixNQUFNTyxjQUFjLElBQUlMLDhEQUFXQTtBQUVwQixTQUFTTSxJQUFJLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFZO0lBQzVELHFCQUNFLDhEQUFDQztRQUFJQyxXQUFXLENBQUMsRUFBRWQsa09BQXFCLENBQUMsQ0FBQyxFQUFFQyx5TEFBYyxDQUFDLENBQUMsRUFBRUMsME5BQXNCLENBQUMsVUFBVSxDQUFDO2tCQUM5Riw0RUFBQ0MsZ0RBQWFBO1lBQUNLLFFBQVFBLCtDQUFNQTtzQkFDM0IsNEVBQUNILHNFQUFtQkE7Z0JBQUNXLFFBQVFQOzBCQUMzQiw0RUFBQ0gsc0VBQWtCQTtvQkFDakJXLFdBQVU7b0JBQ1ZDLGNBQWNYLHFEQUFXQTs4QkFFekIsNEVBQUNJO3dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTXBDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYXJjYW5lZmktZnJvbnRlbmQvLi9wYWdlcy9fYXBwLnRzeD8yZmJlIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgQXBwUHJvcHMgfSBmcm9tICduZXh0L2FwcCc7XG5pbXBvcnQgeyBXYWdtaVByb3ZpZGVyIH0gZnJvbSAnd2FnbWknO1xuaW1wb3J0IHsgUXVlcnlDbGllbnQsIFF1ZXJ5Q2xpZW50UHJvdmlkZXIgfSBmcm9tICdAdGFuc3RhY2svcmVhY3QtcXVlcnknO1xuaW1wb3J0IHsgUmFpbmJvd0tpdFByb3ZpZGVyIH0gZnJvbSAnQHJhaW5ib3ctbWUvcmFpbmJvd2tpdCc7XG5pbXBvcnQgeyBiYXNlU2Vwb2xpYSB9IGZyb20gJ3dhZ21pL2NoYWlucyc7XG5pbXBvcnQgeyBTcGFjZV9Hcm90ZXNrLCBJbnRlciwgSmV0QnJhaW5zX01vbm8gfSBmcm9tICduZXh0L2ZvbnQvZ29vZ2xlJztcbmltcG9ydCB7IGNvbmZpZyB9IGZyb20gJy4uL2xpYi93YWxsZXQnO1xuaW1wb3J0ICdAcmFpbmJvdy1tZS9yYWluYm93a2l0L3N0eWxlcy5jc3MnO1xuaW1wb3J0ICcuLi9zdHlsZXMvZ2xvYmFscy5jc3MnO1xuXG5jb25zdCBzcGFjZUdyb3Rlc2sgPSBTcGFjZV9Hcm90ZXNrKHtcbiAgdmFyaWFibGU6ICctLWZvbnQtaGVhZGluZycsXG4gIHN1YnNldHM6IFsnbGF0aW4nXSxcbiAgZGlzcGxheTogJ3N3YXAnLFxuICB3ZWlnaHQ6IFsnNDAwJywgJzUwMCcsICc2MDAnLCAnNzAwJ10sXG59KTtcblxuY29uc3QgaW50ZXIgPSBJbnRlcih7XG4gIHZhcmlhYmxlOiAnLS1mb250LWJvZHknLFxuICBzdWJzZXRzOiBbJ2xhdGluJ10sXG4gIGRpc3BsYXk6ICdzd2FwJyxcbn0pO1xuXG5jb25zdCBqZXRCcmFpbnNNb25vID0gSmV0QnJhaW5zX01vbm8oe1xuICB2YXJpYWJsZTogJy0tZm9udC1tb25vJyxcbiAgc3Vic2V0czogWydsYXRpbiddLFxuICBkaXNwbGF5OiAnc3dhcCcsXG4gIHdlaWdodDogWyc0MDAnLCAnNTAwJ10sXG59KTtcblxuY29uc3QgcXVlcnlDbGllbnQgPSBuZXcgUXVlcnlDbGllbnQoKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKHsgQ29tcG9uZW50LCBwYWdlUHJvcHMgfTogQXBwUHJvcHMpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT17YCR7c3BhY2VHcm90ZXNrLnZhcmlhYmxlfSAke2ludGVyLnZhcmlhYmxlfSAke2pldEJyYWluc01vbm8udmFyaWFibGV9IGZvbnQtYm9keWB9PlxuICAgICAgPFdhZ21pUHJvdmlkZXIgY29uZmlnPXtjb25maWd9PlxuICAgICAgICA8UXVlcnlDbGllbnRQcm92aWRlciBjbGllbnQ9e3F1ZXJ5Q2xpZW50fT5cbiAgICAgICAgICA8UmFpbmJvd0tpdFByb3ZpZGVyXG4gICAgICAgICAgICBtb2RhbFNpemU9XCJjb21wYWN0XCJcbiAgICAgICAgICAgIGluaXRpYWxDaGFpbj17YmFzZVNlcG9saWF9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxuICAgICAgICAgIDwvUmFpbmJvd0tpdFByb3ZpZGVyPlxuICAgICAgICA8L1F1ZXJ5Q2xpZW50UHJvdmlkZXI+XG4gICAgICA8L1dhZ21pUHJvdmlkZXI+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbiJdLCJuYW1lcyI6WyJzcGFjZUdyb3Rlc2siLCJpbnRlciIsImpldEJyYWluc01vbm8iLCJXYWdtaVByb3ZpZGVyIiwiUXVlcnlDbGllbnQiLCJRdWVyeUNsaWVudFByb3ZpZGVyIiwiUmFpbmJvd0tpdFByb3ZpZGVyIiwiYmFzZVNlcG9saWEiLCJjb25maWciLCJxdWVyeUNsaWVudCIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsImRpdiIsImNsYXNzTmFtZSIsInZhcmlhYmxlIiwiY2xpZW50IiwibW9kYWxTaXplIiwiaW5pdGlhbENoYWluIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "@rainbow-me/rainbowkit":
/*!*****************************************!*\
  !*** external "@rainbow-me/rainbowkit" ***!
  \*****************************************/
/***/ ((module) => {

"use strict";
module.exports = import("@rainbow-me/rainbowkit");;

/***/ }),

/***/ "@tanstack/react-query":
/*!****************************************!*\
  !*** external "@tanstack/react-query" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = import("@tanstack/react-query");;

/***/ }),

/***/ "viem":
/*!***********************!*\
  !*** external "viem" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = import("viem");;

/***/ }),

/***/ "wagmi":
/*!************************!*\
  !*** external "wagmi" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = import("wagmi");;

/***/ }),

/***/ "wagmi/chains":
/*!*******************************!*\
  !*** external "wagmi/chains" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = import("wagmi/chains");;

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@rainbow-me"], () => (__webpack_exec__("./pages/_app.tsx")));
module.exports = __webpack_exports__;

})();