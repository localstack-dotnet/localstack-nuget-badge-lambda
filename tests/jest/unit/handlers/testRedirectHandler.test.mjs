/*──────────────────────────────────────
  Unit Tests: Test Redirect Handler
  Tests Gist integration, parameter validation, redirect generation, and error handling
──────────────────────────────────────*/

import { jest } from "@jest/globals";
import {
  createLambdaEvent,
  expectRedirectResponse,
  expectErrorResponse,
} from "../../helpers/testUtils.mjs";

// Mock gistService before importing the handler
jest.unstable_mockModule("../../../../src/services/gistService.mjs", () => ({
  gistService: {
    getRedirectUrl: jest.fn(),
  },
}));

// Import handler and gistService after mocking
const { gistService } = await import(
  "../../../../src/services/gistService.mjs"
);
const { testRedirectHandler } = await import(
  "../../../../src/handlers/testRedirectHandler.mjs"
);

describe("Test Redirect Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Redirects", () => {
    test("redirects to GitHub Actions URL when available", async () => {
      const testUrl =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions/runs/123456";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expectRedirectResponse(response, testUrl);
      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
    });

    test("handles complex GitHub Actions URLs", async () => {
      const complexUrl =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions/runs/7234567890/job/19876543210";
      gistService.getRedirectUrl.mockResolvedValue(complexUrl);

      const event = createLambdaEvent("redirect/test-results/windows");
      const response = await testRedirectHandler.handle(event, "windows");

      expectRedirectResponse(response, complexUrl);
    });

    test("sets appropriate cache headers for successful redirects", async () => {
      const testUrl = "https://github.com/localstack/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
      expect(response.headers["Location"]).toBe(testUrl);
    });

    test("returns 302 status code for redirects", async () => {
      const testUrl = "https://github.com/localstack/actions/runs/456";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/macos");
      const response = await testRedirectHandler.handle(event, "macos");

      expect(response.statusCode).toBe(302);
    });
  });

  describe("Platform Validation", () => {
    test("handles valid platform: linux", async () => {
      const testUrl = "https://github.com/test/actions/runs/1";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("handles valid platform: windows", async () => {
      const testUrl = "https://github.com/test/actions/runs/2";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/windows");
      const response = await testRedirectHandler.handle(event, "windows");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "windows",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("handles valid platform: macos", async () => {
      const testUrl = "https://github.com/test/actions/runs/3";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/macos");
      const response = await testRedirectHandler.handle(event, "macos");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "macos",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("passes platform to gist service without validation", async () => {
      // Handler doesn't validate platforms - that's done at router level
      const testUrl = "https://github.com/test/actions/runs/1";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/ubuntu");
      const response = await testRedirectHandler.handle(event, "ubuntu");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "ubuntu",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("platform parameter takes precedence over event path", async () => {
      const testUrl = "https://github.com/test/actions/runs/4";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      // Path says 'windows' but platform param is 'linux'
      const event = createLambdaEvent("redirect/test-results/windows");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
    });
  });

  describe("Track Parameter Validation", () => {
    test("defaults to v2 track when no query parameter provided", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("accepts valid track parameter v1", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "v1",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v1",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("accepts valid track parameter v2", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "v2",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("returns 400 error for invalid track parameter", async () => {
      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "v3",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Invalid track parameter. Must be 'v1' or 'v2'"
      );
      expect(gistService.getRedirectUrl).not.toHaveBeenCalled();
    });

    test("returns 400 error for various invalid track values", async () => {
      const invalidTracks = ["v3", "invalid", "1", "2", "V1", "V2", "track1"];

      for (const track of invalidTracks) {
        const event = createLambdaEvent("redirect/test-results/linux", {
          track,
        });
        const response = await testRedirectHandler.handle(event, "linux");

        expect(response.statusCode).toBe(400);
        expect(response.body).toContain(
          "Invalid track parameter. Must be 'v1' or 'v2'"
        );
      }

      expect(gistService.getRedirectUrl).not.toHaveBeenCalled();
    });

    test("handles empty string track parameter as invalid", async () => {
      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Invalid track parameter. Must be 'v1' or 'v2'"
      );
      expect(gistService.getRedirectUrl).not.toHaveBeenCalled();
    });

    test("ignores other query parameters when track is valid", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "v1",
        utm_source: "badge",
        ref: "main",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v1",
        null
      );
      expectRedirectResponse(response, testUrl);
    });
  });

  describe("Package Parameter Validation", () => {
    test("accepts valid package parameter", async () => {
      const testUrl = "https://github.com/aspire/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "LocalStack.Aspire.Hosting",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        "LocalStack.Aspire.Hosting"
      );
      expectRedirectResponse(response, testUrl);
    });

    test("uses package-specific gist source when package parameter provided", async () => {
      const testUrl = "https://github.com/aspire/actions/runs/456";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/windows", {
        package: "LocalStack.Aspire.Hosting",
      });
      const response = await testRedirectHandler.handle(event, "windows");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "windows",
        "v2",
        "LocalStack.Aspire.Hosting"
      );
      expectRedirectResponse(response, testUrl);
    });

    test("returns 400 error for invalid package parameter", async () => {
      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "Invalid.Package",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Invalid package parameter. Must be 'LocalStack.Aspire.Hosting' if track is not specified"
      );
      expect(gistService.getRedirectUrl).not.toHaveBeenCalled();
    });

    test("returns 400 error for empty package parameter", async () => {
      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.statusCode).toBe(400);
      expect(response.body).toContain(
        "Invalid package parameter. Must be 'LocalStack.Aspire.Hosting' if track is not specified"
      );
      expect(gistService.getRedirectUrl).not.toHaveBeenCalled();
    });

    test("track parameter takes precedence over package parameter when both provided", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        track: "v1",
        package: "LocalStack.Aspire.Hosting",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      // Should use track, not package
      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v1",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("ignores other query parameters when package is valid", async () => {
      const testUrl = "https://github.com/aspire/actions/runs/789";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "LocalStack.Aspire.Hosting",
        utm_source: "badge",
        ref: "main",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        "LocalStack.Aspire.Hosting"
      );
      expectRedirectResponse(response, testUrl);
    });

    test("uses package-specific fallback URL when using package parameter", async () => {
      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "LocalStack.Aspire.Hosting",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      const expectedFallback =
        "https://github.com/localstack-dotnet/dotnet-aspire-for-localstack/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("uses package-specific fallback URL when gist service throws error", async () => {
      gistService.getRedirectUrl.mockRejectedValue(new Error("Network error"));

      const event = createLambdaEvent("redirect/test-results/windows", {
        package: "LocalStack.Aspire.Hosting",
      });
      const response = await testRedirectHandler.handle(event, "windows");

      const expectedFallback =
        "https://github.com/localstack-dotnet/dotnet-aspire-for-localstack/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("logs appropriate message when using package parameter", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const testUrl = "https://github.com/aspire/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        package: "LocalStack.Aspire.Hosting",
      });
      await testRedirectHandler.handle(event, "linux");

      expect(consoleSpy).toHaveBeenCalledWith(
        "🏷️ Using package: LocalStack.Aspire.Hosting"
      );
      consoleSpy.mockRestore();
    });
  });

  describe("Fallback Handling", () => {
    test("redirects to fallback URL when primary URL is null", async () => {
      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      const expectedFallback =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("uses fallback when gist service throws error", async () => {
      gistService.getRedirectUrl.mockRejectedValue(new Error("Network error"));

      const event = createLambdaEvent("redirect/test-results/windows");
      const response = await testRedirectHandler.handle(event, "windows");

      const expectedFallback =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("uses same cache duration for fallback redirects", async () => {
      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    });

    test("logs appropriate error messages when using fallback", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      gistService.getRedirectUrl.mockRejectedValue(new Error("Test error"));

      const event = createLambdaEvent("redirect/test-results/linux");
      await testRedirectHandler.handle(event, "linux");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "🔥 Error generating redirect for linux (track: v2):"
        ),
        expect.any(String)
      );

      consoleSpy.mockRestore();
    });

    test("logs info message when primary URL is unavailable", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux");
      await testRedirectHandler.handle(event, "linux");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "⚠️ No redirect URL available for linux (track: v2), using fallback"
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe("URL Validation", () => {
    test("accepts valid HTTPS GitHub URLs", async () => {
      const validUrls = [
        "https://github.com/localstack/repo/actions/runs/123",
        "https://github.com/org/project/actions/runs/456/job/789",
        "https://github.com/user/repo/actions/workflows/test.yml/runs/123",
      ];

      for (const url of validUrls) {
        gistService.getRedirectUrl.mockResolvedValue(url);

        const event = createLambdaEvent("redirect/test-results/linux");
        const response = await testRedirectHandler.handle(event, "linux");

        expectRedirectResponse(response, url);
      }
    });

    test("handles URLs with query parameters", async () => {
      const urlWithQuery =
        "https://github.com/localstack/repo/actions/runs/123?check_suite_id=456";
      gistService.getRedirectUrl.mockResolvedValue(urlWithQuery);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expectRedirectResponse(response, urlWithQuery);
    });

    test("handles URLs with fragments", async () => {
      const urlWithFragment =
        "https://github.com/localstack/repo/actions/runs/123#summary";
      gistService.getRedirectUrl.mockResolvedValue(urlWithFragment);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expectRedirectResponse(response, urlWithFragment);
    });

    test("preserves URL encoding in redirects", async () => {
      const encodedUrl =
        "https://github.com/localstack/repo/actions/runs/123?query=test%20data";
      gistService.getRedirectUrl.mockResolvedValue(encodedUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expectRedirectResponse(response, encodedUrl);
    });
  });

  describe("Custom Parameters", () => {
    test("ignores custom query parameters", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        utm_source: "badge",
        ref: "main",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      // Redirect URL should not include query parameters from event
      expectRedirectResponse(response, testUrl);
    });

    test("does not modify URLs based on query parameters", async () => {
      const originalUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(originalUrl);

      const event = createLambdaEvent("redirect/test-results/linux", {
        modify: "true",
        append: "something",
      });
      const response = await testRedirectHandler.handle(event, "linux");

      expectRedirectResponse(response, originalUrl);
    });
  });

  describe("Error Handling & Edge Cases", () => {
    test("handles gist service timeout gracefully", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.code = "ECONNABORTED";
      gistService.getRedirectUrl.mockRejectedValue(timeoutError);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      // Should fall back to default GitHub Actions URL
      const expectedFallback =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("handles malformed gist response", async () => {
      gistService.getRedirectUrl.mockResolvedValue("not-a-valid-url");

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      // Handler uses whatever URL gist service returns
      expectRedirectResponse(response, "not-a-valid-url");
    });

    test("handles empty string URL from gist service", async () => {
      gistService.getRedirectUrl.mockResolvedValue("");

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      const expectedFallback =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("handles undefined URL from gist service", async () => {
      gistService.getRedirectUrl.mockResolvedValue(undefined);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      const expectedFallback =
        "https://github.com/localstack-dotnet/localstack-dotnet-client/actions";
      expectRedirectResponse(response, expectedFallback);
    });

    test("preserves handler execution context", async () => {
      const testUrl = "https://github.com/test/actions/runs/1";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response).toBeDefined();
      expect(typeof response).toBe("object");
      expect(response.statusCode).toBe(302);
    });
  });

  describe("Integration with Router", () => {
    test("correctly processes platform parameter from router", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      // Simulate how router calls the handler
      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
      expectRedirectResponse(response, testUrl);
    });

    test("handles case normalization from router", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      // Router should normalize to lowercase, but handler should handle any case
      const event = createLambdaEvent("redirect/test-results/Linux");
      const response = await testRedirectHandler.handle(event, "linux"); // Router normalized

      expect(gistService.getRedirectUrl).toHaveBeenCalledWith(
        "linux",
        "v2",
        null
      );
    });

    test("maintains consistent redirect format for all platforms", async () => {
      const platforms = ["linux", "windows", "macos"];

      for (const platform of platforms) {
        const testUrl = `https://github.com/test/actions/runs/${platform}`;
        gistService.getRedirectUrl.mockResolvedValue(testUrl);

        const event = createLambdaEvent(`redirect/test-results/${platform}`);
        const response = await testRedirectHandler.handle(event, platform);

        expect(response.statusCode).toBe(302);
        expect(response.headers).toHaveProperty("Location");
        expect(response.headers).toHaveProperty("Cache-Control");
      }
    });
  });

  describe("Response Format Validation", () => {
    test("generates valid redirect response format", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response).toMatchObject({
        statusCode: 302,
        headers: {
          Location: testUrl,
          "Cache-Control": expect.any(String),
        },
        body: "",
      });
    });

    test("includes empty body", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.body).toBe("");
    });

    test("does not include content-type header", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.headers["Content-Type"]).toBeUndefined();
    });

    test("fallback response has same format as primary response", async () => {
      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response).toMatchObject({
        statusCode: 302,
        headers: {
          Location: expect.any(String),
          "Cache-Control": expect.any(String),
        },
        body: "",
      });
    });
  });

  describe("Performance & Caching", () => {
    test("uses appropriate cache duration for successful redirects", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    });

    test("uses same cache duration for fallback redirects", async () => {
      gistService.getRedirectUrl.mockResolvedValue(null);

      const event = createLambdaEvent("redirect/test-results/linux");
      const response = await testRedirectHandler.handle(event, "linux");

      expect(response.headers["Cache-Control"]).toBe("public, max-age=300");
    });

    test("handles multiple concurrent requests efficiently", async () => {
      const testUrl = "https://github.com/test/actions/runs/123";
      gistService.getRedirectUrl.mockResolvedValue(testUrl);

      const events = [
        createLambdaEvent("redirect/test-results/linux"),
        createLambdaEvent("redirect/test-results/windows"),
        createLambdaEvent("redirect/test-results/macos"),
      ];

      const responses = await Promise.all([
        testRedirectHandler.handle(events[0], "linux"),
        testRedirectHandler.handle(events[1], "windows"),
        testRedirectHandler.handle(events[2], "macos"),
      ]);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(302);
        expectRedirectResponse(response, testUrl);
      });
    });
  });
});
