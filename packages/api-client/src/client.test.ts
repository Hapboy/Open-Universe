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

test("204 responses resolve to undefined without parsing a body", async () => {
    const client = new HayverseApiClient({
        baseUrl: "http://localhost:4175",
        fetch: fakeFetch(() => new Response(null, { status: 204 })),
    });

    const result = await client.scenes.remove("1");
    assert.equal(result, undefined);
});
