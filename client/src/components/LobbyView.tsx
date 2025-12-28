import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { RoomState } from "../types";
import { PlayerList } from "./PlayerList";

interface LobbyViewProps {
  room: RoomState;
  isHost: boolean;
  onStartGame: () => Promise<void>;
  onUpdateSettings: (settings: Partial<RoomState["settings"]>) => Promise<void>;
}

const resolveMinPlayers = () => {
  const raw = Number(import.meta.env.VITE_MIN_PLAYERS ?? "3");
  if (Number.isFinite(raw) && raw >= 2) {
    return Math.floor(raw);
  }
  return 3;
};

const SETTINGS_LIMITS = {
  maxRounds: { min: 1, max: 10, suffix: "rounds" },
  secondsToAnswer: { min: 15, max: 120, suffix: "seconds" },
  secondsToVote: { min: 10, max: 90, suffix: "seconds" },
  secondsToReveal: { min: 5, max: 45, suffix: "seconds" },
};

export function LobbyView({ room, isHost, onStartGame, onUpdateSettings }: LobbyViewProps) {
  const connectedCount = room.players.filter((p) => p.connected).length;
  const minPlayers = resolveMinPlayers();
  const canStart = isHost && connectedCount >= minPlayers;
  const [draftSettings, setDraftSettings] = useState(room.settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftSettings(room.settings);
  }, [room.settings]);

  const hasChanges =
    draftSettings.maxRounds !== room.settings.maxRounds ||
    draftSettings.secondsToAnswer !== room.settings.secondsToAnswer ||
    draftSettings.secondsToVote !== room.settings.secondsToVote ||
    draftSettings.secondsToReveal !== room.settings.secondsToReveal;

  const handleStart = () => {
    if (!canStart) return;
    void onStartGame();
  };

  const handleSaveSettings = async () => {
    if (!isHost || !hasChanges) return;
    setSaving(true);
    await onUpdateSettings(draftSettings);
    setSaving(false);
  };

  const handleSettingChange = (key: keyof RoomState["settings"]) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setDraftSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row">
      <div className="flex-1 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Room code</p>
            <div className="mt-1 flex items-center gap-2 text-4xl font-black tracking-[0.4em] text-slate-900">
              {room.code}
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow"
                onClick={() => navigator.clipboard.writeText(room.code)}
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Share this code with friends. Host: {isHost ? "You" : room.hostName}
            </p>
          </div>
          {isHost && (
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300"
            >
              {canStart ? "Start Game" : `Need ${minPlayers}+ players`}
            </button>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SettingField
              label="Rounds"
              value={draftSettings.maxRounds}
              min={SETTINGS_LIMITS.maxRounds.min}
              max={SETTINGS_LIMITS.maxRounds.max}
              suffix={SETTINGS_LIMITS.maxRounds.suffix}
              editable={isHost}
              onChange={handleSettingChange("maxRounds")}
            />
            <SettingField
              label="Answer time"
              value={draftSettings.secondsToAnswer}
              min={SETTINGS_LIMITS.secondsToAnswer.min}
              max={SETTINGS_LIMITS.secondsToAnswer.max}
              suffix={SETTINGS_LIMITS.secondsToAnswer.suffix}
              editable={isHost}
              onChange={handleSettingChange("secondsToAnswer")}
            />
            <SettingField
              label="Voting time"
              value={draftSettings.secondsToVote}
              min={SETTINGS_LIMITS.secondsToVote.min}
              max={SETTINGS_LIMITS.secondsToVote.max}
              suffix={SETTINGS_LIMITS.secondsToVote.suffix}
              editable={isHost}
              onChange={handleSettingChange("secondsToVote")}
            />
            <SettingField
              label="Reveal time"
              value={draftSettings.secondsToReveal}
              min={SETTINGS_LIMITS.secondsToReveal.min}
              max={SETTINGS_LIMITS.secondsToReveal.max}
              suffix={SETTINGS_LIMITS.secondsToReveal.suffix}
              editable={isHost}
              onChange={handleSettingChange("secondsToReveal")}
            />
          </div>
          {isHost && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="text-slate-500">{hasChanges ? "Unsaved changes" : "Settings synced"}</p>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={!hasChanges || saving}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300"
              >
                {saving ? "Saving..." : "Save settings"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1">
        <PlayerList players={room.players} />
      </div>
    </div>
  );
}

function SettingField({
  label,
  value,
  min,
  max,
  suffix,
  editable,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  editable: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-center shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {editable ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          <input
            type="number"
            min={min}
            max={max}
            step={1}
            value={value}
            onChange={onChange}
            className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center text-base font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{suffix}</span>
        </div>
      ) : (
        <p className="text-2xl font-black text-slate-900">
          {value}
          {suffix === "seconds" ? "s" : ""}
        </p>
      )}
    </div>
  );
}
