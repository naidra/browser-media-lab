import { describe, it, expect } from "vitest";
import { formatTime, formatTimeDisplay } from "@/lib/ffmpeg";

describe("ffmpeg time helpers", () => {
  it("formats ffmpeg timestamps with centiseconds", () => {
    expect(formatTime(71)).toBe("00:01:11.00");
    expect(formatTime(131.34)).toBe("00:02:11.34");
  });

  it("formats display timestamps beyond one hour", () => {
    expect(formatTimeDisplay(71)).toBe("1:11");
    expect(formatTimeDisplay(3671)).toBe("1:01:11");
  });
});
