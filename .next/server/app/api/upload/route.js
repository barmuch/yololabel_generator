"use strict";
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
exports.id = "app/api/upload/route";
exports.ids = ["app/api/upload/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fupload%2Froute&page=%2Fapi%2Fupload%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Froute.ts&appDir=D%3A%5CProject%5Cnext-yolo-label-generator%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CProject%5Cnext-yolo-label-generator&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fupload%2Froute&page=%2Fapi%2Fupload%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Froute.ts&appDir=D%3A%5CProject%5Cnext-yolo-label-generator%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CProject%5Cnext-yolo-label-generator&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var D_Project_next_yolo_label_generator_app_api_upload_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/upload/route.ts */ \"(rsc)/./app/api/upload/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/upload/route\",\n        pathname: \"/api/upload\",\n        filename: \"route\",\n        bundlePath: \"app/api/upload/route\"\n    },\n    resolvedPagePath: \"D:\\\\Project\\\\next-yolo-label-generator\\\\app\\\\api\\\\upload\\\\route.ts\",\n    nextConfigOutput,\n    userland: D_Project_next_yolo_label_generator_app_api_upload_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/upload/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZ1cGxvYWQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRnVwbG9hZCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRnVwbG9hZCUyRnJvdXRlLnRzJmFwcERpcj1EJTNBJTVDUHJvamVjdCU1Q25leHQteW9sby1sYWJlbC1nZW5lcmF0b3IlNUNhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPUQlM0ElNUNQcm9qZWN0JTVDbmV4dC15b2xvLWxhYmVsLWdlbmVyYXRvciZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDa0I7QUFDL0Y7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly95b2xvLWxhYmVsLWdlbmVyYXRvci8/MDU2NyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCB7IHBhdGNoRmV0Y2ggYXMgX3BhdGNoRmV0Y2ggfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9saWIvcGF0Y2gtZmV0Y2hcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCJEOlxcXFxQcm9qZWN0XFxcXG5leHQteW9sby1sYWJlbC1nZW5lcmF0b3JcXFxcYXBwXFxcXGFwaVxcXFx1cGxvYWRcXFxccm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL3VwbG9hZC9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL3VwbG9hZFwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvdXBsb2FkL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiRDpcXFxcUHJvamVjdFxcXFxuZXh0LXlvbG8tbGFiZWwtZ2VuZXJhdG9yXFxcXGFwcFxcXFxhcGlcXFxcdXBsb2FkXFxcXHJvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuY29uc3Qgb3JpZ2luYWxQYXRobmFtZSA9IFwiL2FwaS91cGxvYWQvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fupload%2Froute&page=%2Fapi%2Fupload%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Froute.ts&appDir=D%3A%5CProject%5Cnext-yolo-label-generator%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CProject%5Cnext-yolo-label-generator&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/upload/route.ts":
/*!*********************************!*\
  !*** ./app/api/upload/route.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var cloudinary__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! cloudinary */ \"(rsc)/./node_modules/cloudinary/cloudinary.js\");\n/* harmony import */ var cloudinary__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(cloudinary__WEBPACK_IMPORTED_MODULE_1__);\n\n\n// Configure Cloudinary\ncloudinary__WEBPACK_IMPORTED_MODULE_1__.v2.config({\n    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,\n    api_key: process.env.CLOUDINARY_API_KEY,\n    api_secret: process.env.CLOUDINARY_API_SECRET\n});\nasync function POST(request) {\n    try {\n        console.log(\"=== UPLOAD API DEBUG ===\");\n        console.log(\"Environment variables:\");\n        console.log(\"CLOUDINARY_CLOUD_NAME:\", process.env.CLOUDINARY_CLOUD_NAME);\n        console.log(\"CLOUDINARY_API_KEY:\", process.env.CLOUDINARY_API_KEY);\n        console.log(\"CLOUDINARY_API_SECRET:\", process.env.CLOUDINARY_API_SECRET ? \"Set\" : \"Not set\");\n        const formData = await request.formData();\n        const file = formData.get(\"file\");\n        if (!file) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"No file provided\"\n            }, {\n                status: 400\n            });\n        }\n        console.log(\"Uploading file:\", file.name, \"size:\", file.size, \"type:\", file.type);\n        // Convert file to buffer\n        const bytes = await file.arrayBuffer();\n        const buffer = Buffer.from(bytes);\n        // Test with absolute minimal configuration\n        const result = await new Promise((resolve, reject)=>{\n            cloudinary__WEBPACK_IMPORTED_MODULE_1__.v2.uploader.upload_stream({\n                resource_type: \"image\"\n            }, (error, result)=>{\n                if (error) {\n                    console.error(\"Cloudinary upload error:\", error);\n                    reject(error);\n                } else {\n                    console.log(\"Cloudinary upload success:\", result?.public_id);\n                    resolve(result);\n                }\n            }).end(buffer);\n        });\n        const cloudinaryResult = result;\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            url: cloudinaryResult.secure_url,\n            public_id: cloudinaryResult.public_id,\n            width: cloudinaryResult.width,\n            height: cloudinaryResult.height,\n            format: cloudinaryResult.format,\n            bytes: cloudinaryResult.bytes\n        });\n    } catch (error) {\n        console.error(\"Upload API error:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Failed to upload image to Cloudinary\",\n            details: error instanceof Error ? error.message : \"Unknown error\"\n        }, {\n            status: 500\n        });\n    }\n}\nasync function DELETE(request) {\n    try {\n        const { searchParams } = new URL(request.url);\n        const publicId = searchParams.get(\"public_id\");\n        if (!publicId) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"No public_id provided\"\n            }, {\n                status: 400\n            });\n        }\n        // Delete from Cloudinary\n        const result = await cloudinary__WEBPACK_IMPORTED_MODULE_1__.v2.uploader.destroy(publicId);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true,\n            result: result.result\n        });\n    } catch (error) {\n        console.error(\"Cloudinary delete error:\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Failed to delete image from Cloudinary\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFNUyxTQUFTLE1BQU01QiwwQ0FBVUEsQ0FBQ2dDLFFBQVEsQ0FBQ21CLE9BQU8sQ0FBQ0Q7UUFFakQsT0FBT3BELHFEQUFZQSxDQUFDbUIsSUFBSSxDQUFDO1lBQ3ZCcUIsU0FBUztZQUNUVixRQUFRQSxPQUFPQSxNQUFNO1FBQ3ZCO0lBRUYsRUFBRSxPQUFPVixPQUFPO1FBQ2ROLFFBQVFNLEtBQUssQ0FBQyw0QkFBNEJBO1FBQzFDLE9BQU9wQixxREFBWUEsQ0FBQ21CLElBQUksQ0FDdEI7WUFBRUMsT0FBTztRQUF5QyxHQUNsRDtZQUFFQyxRQUFRO1FBQUk7SUFFbEI7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL3lvbG8tbGFiZWwtZ2VuZXJhdG9yLy4vYXBwL2FwaS91cGxvYWQvcm91dGUudHM/YTg4ZCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVxdWVzdCwgTmV4dFJlc3BvbnNlIH0gZnJvbSAnbmV4dC9zZXJ2ZXInO1xyXG5pbXBvcnQgeyB2MiBhcyBjbG91ZGluYXJ5IH0gZnJvbSAnY2xvdWRpbmFyeSc7XHJcblxyXG4vLyBDb25maWd1cmUgQ2xvdWRpbmFyeVxyXG5jbG91ZGluYXJ5LmNvbmZpZyh7XHJcbiAgY2xvdWRfbmFtZTogcHJvY2Vzcy5lbnYuQ0xPVURJTkFSWV9DTE9VRF9OQU1FLFxyXG4gIGFwaV9rZXk6IHByb2Nlc3MuZW52LkNMT1VESU5BUllfQVBJX0tFWSxcclxuICBhcGlfc2VjcmV0OiBwcm9jZXNzLmVudi5DTE9VRElOQVJZX0FQSV9TRUNSRVQsXHJcbn0pO1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxdWVzdDogTmV4dFJlcXVlc3QpIHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJz09PSBVUExPQUQgQVBJIERFQlVHID09PScpO1xyXG4gICAgY29uc29sZS5sb2coJ0Vudmlyb25tZW50IHZhcmlhYmxlczonKTtcclxuICAgIGNvbnNvbGUubG9nKCdDTE9VRElOQVJZX0NMT1VEX05BTUU6JywgcHJvY2Vzcy5lbnYuQ0xPVURJTkFSWV9DTE9VRF9OQU1FKTtcclxuICAgIGNvbnNvbGUubG9nKCdDTE9VRElOQVJZX0FQSV9LRVk6JywgcHJvY2Vzcy5lbnYuQ0xPVURJTkFSWV9BUElfS0VZKTtcclxuICAgIGNvbnNvbGUubG9nKCdDTE9VRElOQVJZX0FQSV9TRUNSRVQ6JywgcHJvY2Vzcy5lbnYuQ0xPVURJTkFSWV9BUElfU0VDUkVUID8gJ1NldCcgOiAnTm90IHNldCcpO1xyXG5cclxuICAgIGNvbnN0IGZvcm1EYXRhID0gYXdhaXQgcmVxdWVzdC5mb3JtRGF0YSgpO1xyXG4gICAgY29uc3QgZmlsZSA9IGZvcm1EYXRhLmdldCgnZmlsZScpIGFzIEZpbGU7XHJcblxyXG4gICAgaWYgKCFmaWxlKSB7XHJcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnTm8gZmlsZSBwcm92aWRlZCcgfSwgeyBzdGF0dXM6IDQwMCB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZygnVXBsb2FkaW5nIGZpbGU6JywgZmlsZS5uYW1lLCAnc2l6ZTonLCBmaWxlLnNpemUsICd0eXBlOicsIGZpbGUudHlwZSk7XHJcblxyXG4gICAgLy8gQ29udmVydCBmaWxlIHRvIGJ1ZmZlclxyXG4gICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCk7XHJcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShieXRlcyk7XHJcblxyXG4gICAgLy8gVGVzdCB3aXRoIGFic29sdXRlIG1pbmltYWwgY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBjbG91ZGluYXJ5LnVwbG9hZGVyLnVwbG9hZF9zdHJlYW0oXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcmVzb3VyY2VfdHlwZTogJ2ltYWdlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgKGVycm9yLCByZXN1bHQpID0+IHtcclxuICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDbG91ZGluYXJ5IHVwbG9hZCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQ2xvdWRpbmFyeSB1cGxvYWQgc3VjY2VzczonLCByZXN1bHQ/LnB1YmxpY19pZCk7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICkuZW5kKGJ1ZmZlcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjbG91ZGluYXJ5UmVzdWx0ID0gcmVzdWx0IGFzIGFueTtcclxuXHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICB1cmw6IGNsb3VkaW5hcnlSZXN1bHQuc2VjdXJlX3VybCxcclxuICAgICAgcHVibGljX2lkOiBjbG91ZGluYXJ5UmVzdWx0LnB1YmxpY19pZCxcclxuICAgICAgd2lkdGg6IGNsb3VkaW5hcnlSZXN1bHQud2lkdGgsXHJcbiAgICAgIGhlaWdodDogY2xvdWRpbmFyeVJlc3VsdC5oZWlnaHQsXHJcbiAgICAgIGZvcm1hdDogY2xvdWRpbmFyeVJlc3VsdC5mb3JtYXQsXHJcbiAgICAgIGJ5dGVzOiBjbG91ZGluYXJ5UmVzdWx0LmJ5dGVzLFxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdVcGxvYWQgQVBJIGVycm9yOicsIGVycm9yKTtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcclxuICAgICAgeyBcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byB1cGxvYWQgaW1hZ2UgdG8gQ2xvdWRpbmFyeScsXHJcbiAgICAgICAgZGV0YWlsczogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgfSxcclxuICAgICAgeyBzdGF0dXM6IDUwMCB9XHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIERFTEVURShyZXF1ZXN0OiBOZXh0UmVxdWVzdCkge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IHNlYXJjaFBhcmFtcyB9ID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7XHJcbiAgICBjb25zdCBwdWJsaWNJZCA9IHNlYXJjaFBhcmFtcy5nZXQoJ3B1YmxpY19pZCcpO1xyXG5cclxuICAgIGlmICghcHVibGljSWQpIHtcclxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdObyBwdWJsaWNfaWQgcHJvdmlkZWQnIH0sIHsgc3RhdHVzOiA0MDAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVsZXRlIGZyb20gQ2xvdWRpbmFyeVxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xvdWRpbmFyeS51cGxvYWRlci5kZXN0cm95KHB1YmxpY0lkKTtcclxuXHJcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICByZXN1bHQ6IHJlc3VsdC5yZXN1bHQsXHJcbiAgICB9KTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Nsb3VkaW5hcnkgZGVsZXRlIGVycm9yOicsIGVycm9yKTtcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihcclxuICAgICAgeyBlcnJvcjogJ0ZhaWxlZCB0byBkZWxldGUgaW1hZ2UgZnJvbSBDbG91ZGluYXJ5JyB9LFxyXG4gICAgICB7IHN0YXR1czogNTAwIH1cclxuICAgICk7XHJcbiAgfVxyXG59XHJcbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJ2MiIsImNsb3VkaW5hcnkiLCJjb25maWciLCJjbG91ZF9uYW1lIiwicHJvY2VzcyIsImVudiIsIkNMT1VESU5BUllfQ0xPVURfTkFNRSIsImFwaV9rZXkiLCJDTE9VRElOQVJZX0FQSV9LRVkiLCJhcGlfc2VjcmV0IiwiQ0xPVURJTkFSWV9BUElfU0VDUkVUIiwiUE9TVCIsInJlcXVlc3QiLCJjb25zb2xlIiwibG9nIiwiZm9ybURhdGEiLCJmaWxlIiwiZ2V0IiwianNvbiIsImVycm9yIiwic3RhdHVzIiwibmFtZSIsInNpemUiLCJ0eXBlIiwiYnl0ZXMiLCJhcnJheUJ1ZmZlciIsImJ1ZmZlciIsIkJ1ZmZlciIsImZyb20iLCJyZXN1bHQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInVwbG9hZGVyIiwidXBsb2FkX3N0cmVhbSIsInJlc291cmNlX3R5cGUiLCJwdWJsaWNfaWQiLCJlbmQiLCJjbG91ZGluYXJ5UmVzdWx0Iiwic3VjY2VzcyIsInVybCIsInNlY3VyZV91cmwiLCJ3aWR0aCIsImhlaWdodCIsImZvcm1hdCIsImRldGFpbHMiLCJFcnJvciIsIm1lc3NhZ2UiLCJERUxFVEUiLCJzZWFyY2hQYXJhbXMiLCJVUkwiLCJwdWJsaWNJZCIsImRlc3Ryb3kiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/upload/route.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/lodash","vendor-chunks/cloudinary","vendor-chunks/q"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fupload%2Froute&page=%2Fapi%2Fupload%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fupload%2Froute.ts&appDir=D%3A%5CProject%5Cnext-yolo-label-generator%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=D%3A%5CProject%5Cnext-yolo-label-generator&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();