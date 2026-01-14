import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
	const env = loadEnv(mode, process.cwd());
	return defineConfig({
		plugins: [react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		build: {
			outDir: "dist",
			sourcemap: true,
			rollupOptions: {
				output: {
					manualChunks: {
						"react-vendor": ["react", "react-dom"],
						"video-libs": ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
					},
				},
			},
		},
		server: {
			port: 3000,
			proxy: {
				"/api": {
					target: env.VITE_API_URL || "http://localhost:8000",
					changeOrigin: true,
				},
			},
			allowedHosts: ["shortvideoeditor.com", "host.docker.internal"],
		},
	});
};
