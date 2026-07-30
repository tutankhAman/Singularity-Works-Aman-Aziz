import { describe, expect, it } from "bun:test";
import {
  getActor,
  getOrCreateActor,
  removeActor,
  SessionActor,
} from "../src/session-actor";

describe("SessionActor Unit Tests", () => {
  it("should create a session actor with correct initial state", () => {
    const actor = new SessionActor(
      "sess-1",
      "user-1",
      "test@lucid.app",
      "learning"
    );

    expect(actor.sessionId).toBe("sess-1");
    expect(actor.userId).toBe("user-1");
    expect(actor.email).toBe("test@lucid.app");
    expect(actor.mode).toBe("learning");
    expect(actor.getRecentUtterances()).toEqual([]);
    expect(actor.getDocChunks()).toEqual([]);
  });

  it("should accumulate utterances and enforce ring buffer bounds", () => {
    const actor = new SessionActor(
      "sess-2",
      "user-2",
      "test2@lucid.app",
      "active"
    );

    for (let i = 0; i < 110; i++) {
      actor.addUtterance(`Utterance ${i}`, true, "host");
    }

    const utterances = actor.getRecentUtterances(150);
    expect(utterances.length).toBe(100);
    expect(utterances[0]?.text).toBe("Utterance 10");
    expect(utterances[99]?.text).toBe("Utterance 109");
  });

  it("should manage docChunks and liveAlerts correctly", () => {
    const actor = new SessionActor(
      "sess-3",
      "user-3",
      "test3@lucid.app",
      "learning"
    );

    actor.setDocChunks([
      { id: "c1", text: "Architecture document summary" },
      { id: "c2", text: "Database schema details" },
    ]);

    expect(actor.getDocChunks().length).toBe(2);

    actor.addAlert({ type: "risk", message: "Deadline tight" });
    expect(actor.getLiveAlerts().length).toBe(1);
  });

  it("should register and cleanup global active actors", () => {
    const actor = getOrCreateActor("global-sess-1", "u1", "e1@a.com", "active");
    expect(getActor("global-sess-1")).toBe(actor);

    removeActor("global-sess-1");
    expect(getActor("global-sess-1")).toBeUndefined();
  });
});
