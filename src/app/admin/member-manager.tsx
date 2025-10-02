"use client";

import { ChangeEvent, FormEvent, useState, useTransition } from "react";

import { 
  getUserPermissions, 
  hasPermission, 
  canManageUser, 
  canChangeRole, 
  getRoleDisplayName, 
  getRoleDescription,
  getAssignableRoles,
  type UserRole 
} from "@/lib/auth/permissions";

type Member = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

type EditableMember = Member & {
  draftRole: Member["role"];
  draftFullName: string;
};

type Props = {
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: UserRole;
};

type FieldErrors = Partial<Record<"name" | "email" | "password" | "username" | "avatarUrl", string>>;

type AdminInviteFormProps = {
  onCreated: (member: Member) => void;
  setMessage: (message: string | null) => void;
  setError: (message: string | null) => void;
};


function toEditableMember(member: Member): EditableMember {
  return {
    ...member,
    draftRole: member.role,
    draftFullName: member.full_name ?? "",
  };
}

function AdminInviteForm({ onCreated, setMessage, setError }: AdminInviteFormProps) {
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
    username: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setMessage(null);
    setError(null);

    const payload = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      password: formValues.password,
      username: formValues.username.trim() || undefined,
    };

    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | { message?: string; fieldErrors?: FieldErrors; member?: Member }
        | null;

      if (!response.ok) {
        setFieldErrors(result?.fieldErrors ?? {});
        setError(result?.message ?? "创建管理员失败，请稍后再试");
        return;
      }

      if (result?.member) {
        onCreated(result.member);
      }

      setMessage(result?.message ?? "管理员创建成功");
      setFieldErrors({});
      setFormValues({ name: "", email: "", password: "", username: "" });
    } catch (error) {
      console.error("[AdminInviteForm] submit failed", error);
      setError("创建管理员失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-white/10 bg-slate-900/60 p-4 text-white/85 shadow-sm"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">创建新的管理员</p>
          <p className="text-xs text-white/60">添加具有管理权限的成员，加入当前工作区。</p>
        </div>
        <span className="text-xs text-white/50">新账户将自动分配管理员角色</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-xs text-white/60">
          姓名
          <input
            name="name"
            value={formValues.name}
            onChange={handleChange}
            className="mt-1 rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            placeholder="张三"
            disabled={isSubmitting}
            required
          />
          {fieldErrors.name && <span className="mt-1 text-xs text-rose-300/90">{fieldErrors.name}</span>}
        </label>
        <label className="flex flex-col text-xs text-white/60">
          用户名（可选）
          <input
            name="username"
            value={formValues.username}
            onChange={handleChange}
            className="mt-1 rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            placeholder="仅限字母、数字或下划线"
            disabled={isSubmitting}
          />
          {fieldErrors.username && (
            <span className="mt-1 text-xs text-rose-300/90">{fieldErrors.username}</span>
          )}
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-xs text-white/60">
          邮箱
          <input
            type="email"
            name="email"
            value={formValues.email}
            onChange={handleChange}
            className="mt-1 rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            placeholder="name@example.com"
            disabled={isSubmitting}
            required
          />
          {fieldErrors.email && <span className="mt-1 text-xs text-rose-300/90">{fieldErrors.email}</span>}
        </label>
        <label className="flex flex-col text-xs text-white/60">
          初始密码
          <input
            type="password"
            name="password"
            value={formValues.password}
            onChange={handleChange}
            className="mt-1 rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-sm text-white focus:border-emerald-400/60 focus:outline-none"
            placeholder="至少 8 位字符"
            disabled={isSubmitting}
            required
          />
          {fieldErrors.password && (
            <span className="mt-1 text-xs text-rose-300/90">{fieldErrors.password}</span>
          )}
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded border border-emerald-500/60 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
          disabled={isSubmitting}
        >
          {isSubmitting ? "正在创建..." : "创建管理员"}
        </button>
      </div>
    </form>
  );
}

export function MemberManager({ initialMembers, currentUserId, currentUserRole }: Props) {
    const [members, setMembers] = useState<EditableMember[]>(() => initialMembers.map(toEditableMember));
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

  const handleMemberCreated = (member: Member) => {
    setMembers((prev) => {
      const next = [...prev, toEditableMember(member)];
      return next.sort((a, b) => a.username.localeCompare(b.username));
    });
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
      <AdminInviteForm onCreated={handleMemberCreated} setMessage={setMessage} setError={setError} />
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
                    {isSelf && <span className="ml-2 text-xs text-emerald-300">(您)</span>}
                  </p>
                  <p className="text-xs text-white/60">@{member.username}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      member.role === 'admin' ? 'bg-red-500/20 text-red-300' :
                      member.role === 'editor' ? 'bg-blue-500/20 text-blue-300' :
                      member.role === 'user' ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {getRoleDisplayName(member.role)}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">{getRoleDescription(member.role)}</p>
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
                      disabled={isSelf || isPending || !canManageUser(currentUserRole, member.role)}
                      title={!canManageUser(currentUserRole, member.role) ? "您没有权限修改此用户的角色" : ""}
                    >
                      {getAssignableRoles(currentUserRole).map((role) => (
                        <option key={role} value={role}>
                          {getRoleDisplayName(role)}
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
