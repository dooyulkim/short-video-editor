import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock the api service's getWaveform function
vi.mock("@/services/api", () => ({
	getWaveform: vi.fn(),
}));

import useAudioWaveform, { clearWaveformCache } from "./useAudioWaveform";
import { getWaveform } from "@/services/api";

const mockedGetWaveform = vi.mocked(getWaveform);

describe("useAudioWaveform", () => {
	const mockProjectId = "project-123";

	beforeEach(() => {
		vi.clearAllMocks();
		// Clear the waveform cache between tests
		clearWaveformCache();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with null waveformData and not loading", () => {
		const { result } = renderHook(() => useAudioWaveform(null, null));

		expect(result.current.waveformData).toBeNull();
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should fetch waveform data when audioId is provided", async () => {
		const audioId = "audio-123";
		const mockWaveformData = [0.5, -0.3, 0.8, -0.2, 0.1];

		mockedGetWaveform.mockResolvedValueOnce({
			id: audioId,
			waveform: mockWaveformData,
			duration: 5.0,
			sampleRate: 44100,
		});

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		// Initially loading
		expect(result.current.isLoading).toBe(true);

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.waveformData).toEqual(mockWaveformData);
		expect(result.current.error).toBeNull();
		expect(mockedGetWaveform).toHaveBeenCalledWith(mockProjectId, audioId);
	});

	it("should set error state when fetch fails", async () => {
		const audioId = "audio-123";
		const errorMessage = "Network error";

		mockedGetWaveform.mockRejectedValueOnce(new Error(errorMessage));

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.waveformData).toBeNull();
		expect(result.current.error).toBe(errorMessage);
	});

	it("should cache waveform data for subsequent requests", async () => {
		const audioId = "audio-123";
		const mockWaveformData = [0.5, -0.3, 0.8];

		mockedGetWaveform.mockResolvedValueOnce({
			id: "test-id",
			waveform: mockWaveformData,
			duration: 5.0,
			sampleRate: 44100,
		});

		// First render
		const { result: result1 } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result1.current.isLoading).toBe(false);
		});

		expect(result1.current.waveformData).toEqual(mockWaveformData);
		expect(mockedGetWaveform).toHaveBeenCalledTimes(1);

		// Second render with same audioId - should use cache
		const { result: result2 } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		// Should immediately have data from cache
		expect(result2.current.waveformData).toEqual(mockWaveformData);
		expect(result2.current.isLoading).toBe(false);

		// Should not make another API call
		expect(mockedGetWaveform).toHaveBeenCalledTimes(1);
	});

	it("should refetch when audioId changes", async () => {
		const audioId1 = "audio-123";
		const audioId2 = "audio-456";
		const mockData1 = [0.5, -0.3];
		const mockData2 = [0.8, -0.2];

		mockedGetWaveform
			.mockResolvedValueOnce({ id: "test-id", waveform: mockData1, duration: 5.0, sampleRate: 44100 })
			.mockResolvedValueOnce({ id: "test-id", waveform: mockData2, duration: 5.0, sampleRate: 44100 });

		const { result, rerender } = renderHook(({ audioId }) => useAudioWaveform(mockProjectId, audioId), {
			initialProps: { audioId: audioId1 },
		});

		await waitFor(() => {
			expect(result.current.waveformData).toEqual(mockData1);
		});

		// Change audioId
		rerender({ audioId: audioId2 });

		await waitFor(() => {
			expect(result.current.waveformData).toEqual(mockData2);
		});

		expect(mockedGetWaveform).toHaveBeenCalledTimes(2);
		expect(mockedGetWaveform).toHaveBeenCalledWith(mockProjectId, audioId1);
		expect(mockedGetWaveform).toHaveBeenCalledWith(mockProjectId, audioId2);
	});

	it("should reset state when audioId becomes null", async () => {
		const audioId = "audio-123";
		const mockWaveformData = [0.5, -0.3];

		mockedGetWaveform.mockResolvedValueOnce({
			id: "test-id",
			waveform: mockWaveformData,
			duration: 5.0,
			sampleRate: 44100,
		});

		const { result, rerender } = renderHook(({ audioId }) => useAudioWaveform(mockProjectId, audioId), {
			initialProps: { audioId },
		});

		await waitFor(() => {
			expect(result.current.waveformData).toEqual(mockWaveformData);
		});

		// Set audioId to null
		rerender({ audioId: null as unknown as string });

		expect(result.current.waveformData).toBeNull();
		expect(result.current.error).toBeNull();
		expect(result.current.isLoading).toBe(false);
	});

	it("should handle invalid response format", async () => {
		const audioId = "audio-123";
		const invalidData = { invalid: "format" }; // Not an array

		mockedGetWaveform.mockResolvedValueOnce({
			id: "test-id",
			waveform: invalidData as unknown as number[],
			duration: 5.0,
			sampleRate: 44100,
		});

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.waveformData).toBeNull();
		expect(result.current.error).toBe("Invalid waveform data format");
	});

	it("should handle non-Error exceptions", async () => {
		const audioId = "audio-123";

		mockedGetWaveform.mockRejectedValueOnce("String error");

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).toBe("Failed to fetch waveform data");
	});

	it("should not update state after unmount", async () => {
		const audioId = "audio-123";
		const mockWaveformData = [0.5, -0.3];

		// Delay the response
		mockedGetWaveform.mockImplementation(
			() =>
				new Promise((resolve) =>
					setTimeout(
						() => resolve({ id: "test-id", waveform: mockWaveformData, duration: 5.0, sampleRate: 44100 }),
						100
					)
				)
		);

		const { result, unmount } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		expect(result.current.isLoading).toBe(true);

		// Unmount before response arrives
		unmount();

		// Wait for the delayed response
		await new Promise((resolve) => setTimeout(resolve, 150));

		// No error should be thrown (state update after unmount is prevented)
		// This test passes if no warning/error is thrown
	});

	it("should return valid waveform data structure", async () => {
		const audioId = "audio-123";
		const mockWaveformData = [0.5, -0.3, 0.8, -0.2, 0.1];

		mockedGetWaveform.mockResolvedValueOnce({
			id: "test-id",
			waveform: mockWaveformData,
			duration: 5.0,
			sampleRate: 44100,
		});

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result.current.waveformData).not.toBeNull();
		});

		// Verify it's an array of numbers
		expect(Array.isArray(result.current.waveformData)).toBe(true);
		result.current.waveformData?.forEach((value) => {
			expect(typeof value).toBe("number");
		});
	});

	it("should handle empty waveform data array", async () => {
		const audioId = "audio-123";
		const emptyWaveformData: number[] = [];

		mockedGetWaveform.mockResolvedValueOnce({
			id: "test-id",
			waveform: emptyWaveformData,
			duration: 5.0,
			sampleRate: 44100,
		});

		const { result } = renderHook(() => useAudioWaveform(mockProjectId, audioId));

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.waveformData).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("should maintain separate cache entries for different audioIds", async () => {
		const audioId1 = "audio-123";
		const audioId2 = "audio-456";
		const mockData1 = [0.5, -0.3];
		const mockData2 = [0.8, -0.2];

		mockedGetWaveform
			.mockResolvedValueOnce({ id: "test-id", waveform: mockData1, duration: 5.0, sampleRate: 44100 })
			.mockResolvedValueOnce({ id: "test-id", waveform: mockData2, duration: 5.0, sampleRate: 44100 });

		// Fetch first audio
		const { result: result1 } = renderHook(() => useAudioWaveform(mockProjectId, audioId1));
		await waitFor(() => expect(result1.current.isLoading).toBe(false));

		// Fetch second audio
		const { result: result2 } = renderHook(() => useAudioWaveform(mockProjectId, audioId2));
		await waitFor(() => expect(result2.current.isLoading).toBe(false));

		// Fetch first audio again - should use cache
		const { result: result3 } = renderHook(() => useAudioWaveform(mockProjectId, audioId1));

		expect(result1.current.waveformData).toEqual(mockData1);
		expect(result2.current.waveformData).toEqual(mockData2);
		expect(result3.current.waveformData).toEqual(mockData1);

		// Should only make 2 API calls (one for each unique audioId)
		expect(mockedGetWaveform).toHaveBeenCalledTimes(2);
	});
});
