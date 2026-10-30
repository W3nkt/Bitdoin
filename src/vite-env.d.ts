/// <reference types="vite/client" />

/** Build date as YYYY.MM.DD (vite.config.ts), reported with usage events. */
declare const __APP_BUILD__: string

/** True in the iOS / Android bundle (`vite build --mode native`), false on the web. */
declare const __NATIVE_BUILD__: boolean
