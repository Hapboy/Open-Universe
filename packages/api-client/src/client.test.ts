import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, HayverseApiClient } from "./client.ts";

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof fetch {
    return ((url: string, init: RequestInit) =>
        Promise.resolve(handler(url, init))) as typeof fetch;
}

test("scenes.create posts JSON and returns the parsed scene", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175/",
        fetch: fakeFetch((url, init) => {
            capturedUrl = url;
            capturedInit = init;
            return new Response(JSON.stringify({ id: "1", title: "Test", graph: {} }), {
                status: 201,
            });
        }),
    });

    const scene = await client.scenes.create({ title: "Test" });

    assert.equal(capturedUrl, "http://localhost:4175/scenes");
    assert.equal(capturedInit?.method, "POST");
    assert.equal((capturedInit?.headers as Headers).get("Content-Type"), "application/json");
    assert.equal(capturedInit?.body, JSON.stringify({ title: "Test" }));
    assert.equal(scene.id, "1");
});

test("attaches a bearer token when getAuthToken is provided", async () => {
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        getAuthToken: () => "secret-token",
        fetch: fakeFetch((_url, init) => {
            capturedInit = init;
            return new Response("[]", { status: 200 });
        }),
    });

    await client.scenes.list();

    assert.equal((capturedInit?.headers as Headers).get("Authorization"), "Bearer secret-token");
});

test("media.upload sends a multipart form without a JSON Content-Type", async () => {
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((_url, init) => {
            capturedInit = init;
            return new Response(JSON.stringify({ id: "m1", storageKey: "s3:x", url: "x" }), {
                status: 201,
            });
        }),
    });

    await client.media.upload(new Blob(["data"]), "test.png");

    assert.ok(capturedInit?.body instanceof FormData);
    assert.equal((capturedInit?.headers as Headers).get("Content-Type"), null);
});

test("media.upload appends kind to the form when provided", async () => {
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((_url, init) => {
            capturedInit = init;
            return new Response(JSON.stringify({ id: "m1", storageKey: "s3:x", url: "x" }), {
                status: 201,
            });
        }),
    });

    await client.media.upload(new Blob(["data"]), "test.png", "generated");

    const form = capturedInit?.body as FormData;
    assert.equal(form.get("kind"), "generated");
});

test("non-2xx responses throw ApiError with status and body", async () => {
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch(() => new Response("not found", { status: 404 })),
    });

    await assert.rejects(
        () => client.scenes.get("missing"),
        (err: unknown) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 404);
            assert.equal(err.body, "not found");
            return true;
        },
    );
});

test("presets.upsert posts a client-minted id alongside the snapshot", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((url, init) => {
            capturedUrl = url;
            capturedInit = init;
            return new Response(
                JSON.stringify({ id: "p1", entityType: "character", name: "Test", snapshot: {} }),
                { status: 201 },
            );
        }),
    });

    const preset = await client.presets.upsert({
        id: "p1",
        entityType: "character",
        name: "Test",
        snapshot: { age: 34 },
    });

    assert.equal(capturedUrl, "http://localhost:4175/presets");
    assert.equal(capturedInit?.method, "POST");
    assert.equal(
        capturedInit?.body,
        JSON.stringify({ id: "p1", entityType: "character", name: "Test", snapshot: { age: 34 } }),
    );
    assert.equal(preset.id, "p1");
});

test("presets.list filters by entityType via a query param", async () => {
    let capturedUrl = "";
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((url) => {
            capturedUrl = url;
            return new Response("[]", { status: 200 });
        }),
    });

    await client.presets.list("character");

    assert.equal(capturedUrl, "http://localhost:4175/presets?entityType=character");
});

test("jobs.get polls an AI job by id", async () => {
    let capturedUrl = "";
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((url) => {
            capturedUrl = url;
            return new Response(
                JSON.stringify({ id: "j1", status: "completed", result: { dataUrl: "x" } }),
                { status: 200 },
            );
        }),
    });

    const job = await client.jobs.get("j1");

    assert.equal(capturedUrl, "http://localhost:4175/ai/jobs/j1");
    assert.equal(job.status, "completed");
});

test("gemini.generateText posts JSON to /ai/gemini/text", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch((url, init) => {
            capturedUrl = url;
            capturedInit = init;
            return new Response(JSON.stringify({ text: "hi" }), { status: 201 });
        }),
    });

    const result = await client.gemini.generateText({ prompt: "hi" });

    assert.equal(capturedUrl, "http://localhost:4175/ai/gemini/text");
    assert.equal(capturedInit?.body, JSON.stringify({ prompt: "hi" }));
    assert.equal(result.text, "hi");
});

test("gemini.generateVeo accepts a 202 response and returns jobId", async () => {
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch(() => new Response(JSON.stringify({ jobId: "job-1" }), { status: 202 })),
    });

    const result = await client.gemini.generateVeo({
        prompt: "a river",
        options: { model: "veo-3.1-generate-preview" },
    });

    assert.equal(result.jobId, "job-1");
});

test("gemini.* surfaces a 501 (not configured) as ApiError with that status", async () => {
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch(() => new Response("Gemini not configured", { status: 501 })),
    });

    await assert.rejects(
        () => client.gemini.generateText({ prompt: "hi" }),
        (err: unknown) => {
            assert.ok(err instanceof ApiError);
            assert.equal(err.status, 501);
            return true;
        },
    );
});

test("204 responses resolve to undefined without parsing a body", async () => {
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch(() => new Response(null, { status: 204 })),
    });

    const result = await client.scenes.remove("1");
    assert.equal(result, undefined);
});
