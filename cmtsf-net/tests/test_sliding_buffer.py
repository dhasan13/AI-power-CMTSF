"""
Unit tests for the 4-second sliding window buffer logic (Phase 1).
"""

import os
import sys
import unittest

# Ensure parent cmtsf-net directory is on pythonpath
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

try:
    import numpy as np
    from backend.audio.buffer import SlidingAudioBuffer
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


class TestSlidingAudioBuffer(unittest.TestCase):
    def setUp(self):
        if not NUMPY_AVAILABLE:
            self.skipTest("numpy is required for buffer tests (install via requirements.txt)")
        self.sr = 16000
        self.buffer = SlidingAudioBuffer(sample_rate=self.sr, window_duration_sec=4.0, stride_duration_sec=1.0)

    def test_buffer_initialization(self):
        self.assertEqual(self.buffer.window_samples, 64000)
        self.assertEqual(self.buffer.stride_samples, 16000)
        self.assertFalse(self.buffer.is_window_ready())

    def test_buffer_accumulation_and_slide(self):
        # 1-second chunk of 16,000 samples
        chunk_1s = np.sin(np.linspace(0, 440 * 2 * np.pi, 16000, dtype=np.float32))

        # Chunk 1 (0-1s)
        self.buffer.append_chunk(chunk_1s)
        self.assertFalse(self.buffer.is_window_ready())

        # Chunk 2 (1-2s)
        self.buffer.append_chunk(chunk_1s)
        self.assertFalse(self.buffer.is_window_ready())

        # Chunk 3 (2-3s)
        self.buffer.append_chunk(chunk_1s)
        self.assertFalse(self.buffer.is_window_ready())

        # Chunk 4 (3-4s) -> Window 1 (0–4s) ready!
        self.buffer.append_chunk(chunk_1s)
        self.assertTrue(self.buffer.is_window_ready())

        window_data = self.buffer.get_current_window()
        self.assertIsNotNone(window_data)
        audio_4s, start_t, end_t = window_data
        self.assertEqual(len(audio_4s), 64000)
        self.assertEqual(start_t, 0.0)
        self.assertEqual(end_t, 4.0)

        # Slide buffer (removes 1s, now holds 3s)
        self.buffer.slide()
        self.assertFalse(self.buffer.is_window_ready())
        self.assertEqual(self.buffer.windows_emitted, 1)

        # Chunk 5 (4-5s) -> Window 2 (1–5s) ready!
        self.buffer.append_chunk(chunk_1s)
        self.assertTrue(self.buffer.is_window_ready())
        _, start_t2, end_t2 = self.buffer.get_current_window()
        self.assertEqual(start_t2, 1.0)
        self.assertEqual(end_t2, 5.0)


if __name__ == "__main__":
    unittest.main()
