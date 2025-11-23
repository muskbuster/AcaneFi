self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/index.js"
    ],
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/deposit": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/deposit.js"
    ],
    "/deposit-rari": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/deposit-rari.js"
    ],
    "/trader/[traderId]": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/trader/[traderId].js"
    ],
    "/trader/register": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/trader/register.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];