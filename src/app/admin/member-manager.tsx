
"use client";

import { useState, useTransition } from "react";

type Member = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user";
};

type EditableMember = Member & {
  draftRole: Member["role"];
  draftFullName: string;
};

type Props = {
  initialMembers: Member[];
  currentUserId: string;
};

const ROLE_OPTIONS: Array<{ value: Member["role"]; label: string }> = [
  { value: "admin", label: "Administrator" },
  { value: "user", label: "Member" },
];

export function MemberManager({ initialMembers, currentUserId }: Props) {
  const [members, setMembers] = useState<EditableMember[]>(() =>
    initialMembers.map((member) => ({
      ...member,
      draftRole: member.role,
      draftFullName: member.full_name ?? "",
    })),
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDraftChange = (
    memberId: string,
    patch: Partial<Pick<EditableMember, "draftRole" | "draftFullName">>,
  ) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    );
  };

  const handleSave = (memberId: string) => {
    const target = members.find((member) => member.id === memberId);
    if (!target) {
      return;
    }

    const updates: { role?: Member["role"]; fullName?: string | null } = {};
    if (target.draftRole !== target.role) {
      updates.role = target.draftRole;
    }

    const normalizedFullName = target.draftFullName.trim();
    if ((target.full_name ?? "") !== normalizedFullName) {
      updates.fullName = normalizedFullName.length > 0 ? normalizedFullName : null;
    }

    if (Object.keys(updates).length === 0) {
      setMessage("Nothing to update");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "Update failed, please try again later");
        return;
      }

      const payload = (await response.json()) as { member: Member };
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId
            ? {
                ...member,
                ...payload.member,
                draftRole: payload.member.role,
                draftFullName: payload.member.full_name ?? "",
              }
            : member,
        ),
      );
      setMessage("Member updated");
    });
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-emerald-300">{message}</p>}
      <ul className="space-y-4">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          const hasChanges =
            member.draftRole !== member.role ||
            (member.draftFullName.trim() || "") !== ((member.full_name ?? "").trim() || "");

          return (
            <li
              key={member.id}
              className="rounded-lg border border-white/10 bg-slate-900/60 p-4 text-white/85 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-white">
                    {member.full_name || member.username}
                    {isSelf && <span className="ml-2 text-xs text-emerald-300">(you)</span>}
                  </p>
                  <p className="text-xs text-white/60">@{member.username}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex flex-col text-xs text-white/60">
                    Display name
                    <input
                      value={member.draftFullName}
                      onChange={(event) =>
                        handleDraftChange(member.id, { draftFullName: event.target.value })
                      }
                      className="mt-1 w-52 rounded border border-white/15 bg-slate-950/70 px-2 py-1 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
                      placeholder="Not set"
                      disabled={isPending}
                    />
                  </label>
                  <label className="flex flex-col text-xs text-white/60">
                    Role
                    <select
                      value={member.draftRole}
                      onChange={(event) =>
                        handleDraftChange(member.id, {
                          draftRole: event.target.value as Member["role"],
                        })
                      }
                      className="mt-1 rounded border border-white/15 bg-slate-950/70 px-2 py-1 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
                      disabled={isSelf || isPending}
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSave(member.id)}
                    className="inline-flex items-center justify-center rounded border border-emerald-500/60 px-3 py-1 text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
                    disabled={isPending || !hasChanges}
                  >
                    Save
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {members.length === 0 && (
          <li className="rounded-lg border border-white/10 bg-slate-900/60 p-4 text-sm text-white/60">
            No members yet
          </li>
        )}
      </ul>
    </div>
  );
}
