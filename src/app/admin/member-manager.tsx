"use client";

import { ChangeEvent, FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canChangeRole,
  canManageUser,
  getAssignableRoles,
  getRoleDescription,
  getRoleDisplayName,
  hasPermission,
  type UserRole,
} from "@/lib/auth/permissions";
import {
  aiCard,
  aiMutedText,
  aiPrimaryBtn,
  aiSubCard,
} from "@/components/ui/ai-surface";

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

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "username" | "avatarUrl", string>
>;

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
    if (isSubmitting) return;

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
        setError(result?.message ?? "创建成员失败，请稍后再试");
        return;
      }

      if (result?.member) {
        onCreated(result.member);
      }

      setMessage(result?.message ?? "管理员创建成功");
      setFormValues({ name: "", email: "", password: "", username: "" });
    } catch (error) {
      console.error("[AdminInviteForm] create member failed", error);
      setError("创建成员失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`${aiCard} p-6 space-y-6`}>
      <CardHeader className="space-y-1 p-0">
        <CardTitle className="text-lg font-semibold text-white">邀请新的管理员</CardTitle>
        <CardDescription className={`text-sm ${aiMutedText}`}>
          添加具有管理权限的成员，确保他们属于当前空间。
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <CardContent className="grid gap-4 p-0 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invite-name" className="text-sm text-slate-200">
              姓名
            </Label>
            <Input
              id="invite-name"
              name="name"
              value={formValues.name}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="例如：李同学"
              className="border-white/20 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
              required
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-300/90">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm text-slate-200">
              登录邮箱
            </Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="admin@example.com"
              className="border-white/20 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
              required
            />
            {fieldErrors.email && (
              <p className="text-xs text-rose-300/90">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password" className="text-sm text-slate-200">
              临时密码
            </Label>
            <Input
              id="invite-password"
              name="password"
              type="password"
              value={formValues.password}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="至少 8 位"
              className="border-white/20 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
              required
            />
            {fieldErrors.password && (
              <p className="text-xs text-rose-300/90">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-username" className="text-sm text-slate-200">
              用户名（可选）
            </Label>
            <Input
              id="invite-username"
              name="username"
              value={formValues.username}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="不填写将自动生成"
              className="border-white/20 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
            />
            {fieldErrors.username && (
              <p className="text-xs text-rose-300/90">{fieldErrors.username}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end p-0">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className={`${aiPrimaryBtn} px-5`}
          >
            {isSubmitting ? "创建中..." : "创建管理员"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function MemberManager({ initialMembers, currentUserId, currentUserRole }: Props) {
  const [members, setMembers] = useState<EditableMember[]>(() =>
    initialMembers.map(toEditableMember),
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDraftChange = (
    memberId: string,
    patch: Partial<Pick<EditableMember, "draftRole" | "draftFullName">>,
  ) => {
    setMembers((previous) =>
      previous.map((member) =>
        member.id === memberId ? { ...member, ...patch } : member,
      ),
    );
  };

  const handleMemberCreated = (member: Member) => {
    setMembers((previous) => [toEditableMember(member), ...previous]);
    setMessage("成员已添加");
  };

  const handleSave = (memberId: string) => {
    const target = members.find((item) => item.id === memberId);
    if (!target) return;

    const trimmedName = target.draftFullName.trim();
    const updates: Record<string, unknown> = {};
    const hasRoleChange = target.draftRole !== target.role;
    const hasNameChange =
      (trimmedName || "") !== ((target.full_name ?? "").trim() || "");

    if (!hasRoleChange && !hasNameChange) {
      setMessage(null);
      return;
    }

    if (hasRoleChange && !hasPermission(currentUserRole, "canChangeUserRoles")) {
      setError("当前账号没有权限调整角色");
      return;
    }

    if (hasRoleChange && !canChangeRole(currentUserRole, target.role, target.draftRole)) {
      setError("当前账号没有权限调整到该角色");
      return;
    }

    setError(null);
    setMessage(null);

    if (hasRoleChange) {
      updates.role = target.draftRole;
    }
    if (hasNameChange) {
      updates.full_name = trimmedName;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(payload?.message ?? "更新失败，请稍后再试");
        return;
      }

      const payload = (await response.json()) as { member: Member };
      setMembers((previous) =>
        previous.map((item) =>
          item.id === memberId
            ? {
                ...item,
                ...payload.member,
                draftRole: payload.member.role,
                draftFullName: payload.member.full_name ?? "",
              }
            : item,
        ),
      );
      setMessage("成员信息已更新");
    });
  };

  return (
    <div className="space-y-6">
      <AdminInviteForm onCreated={handleMemberCreated} setMessage={setMessage} setError={setError} />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/50 bg-rose-600/15 px-4 py-2 text-sm text-rose-100"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-400/50 bg-emerald-600/15 px-4 py-2 text-sm text-emerald-100"
        >
          {message}
        </div>
      )}

      <ul className="space-y-4">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          const hasChanges =
            member.draftRole !== member.role ||
            (member.draftFullName.trim() || "") !== ((member.full_name ?? "").trim() || "");

          const roleBadgeClass =
            member.role === "admin"
              ? "bg-rose-500/20 text-rose-100 border-rose-400/60"
              : member.role === "editor"
              ? "bg-sky-500/20 text-sky-100 border-sky-400/60"
              : member.role === "user"
              ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/60"
              : "bg-slate-500/20 text-slate-100 border-slate-400/60";

          return (
            <li key={member.id}>
              <Card className={`${aiCard} p-6`}>
                <CardContent className="flex flex-col gap-4 p-0 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
                      <span>{member.full_name || member.username}</span>
                      {isSelf && <span className="text-xs text-emerald-300">(我)</span>}
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${roleBadgeClass}`}>
                        {getRoleDisplayName(member.role)}
                      </span>
                    </div>
                    <p className={`text-xs ${aiMutedText}`}>@{member.username}</p>
                    <p className={`text-xs ${aiMutedText}`}>{getRoleDescription(member.role)}</p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-200" htmlFor={`display-name-${member.id}`}>
                        展示名称
                      </Label>
                      <Input
                        id={`display-name-${member.id}`}
                        value={member.draftFullName}
                        onChange={(event) =>
                          handleDraftChange(member.id, { draftFullName: event.target.value })
                        }
                        disabled={isPending}
                        placeholder="未填写"
                        className="h-10 w-56 border-white/20 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-200" htmlFor={`role-${member.id}`}>
                        角色
                      </Label>
                      <select
                        id={`role-${member.id}`}
                        value={member.draftRole}
                        onChange={(event) =>
                          handleDraftChange(member.id, {
                            draftRole: event.target.value as Member["role"],
                          })
                        }
                        disabled={
                          isSelf ||
                          isPending ||
                          !canManageUser(currentUserRole, member.role)
                        }
                        className="h-10 min-w-[8rem] rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
                      >
                        {getAssignableRoles(currentUserRole).map((role) => (
                          <option key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSave(member.id)}
                      disabled={isPending || !hasChanges}
                      className={`${aiPrimaryBtn} px-4 py-2`}
                    >
                      保存
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
        {members.length === 0 && (
          <li>
            <Card className={`${aiSubCard} p-6 text-slate-100`}>
              <CardContent className="p-0 text-sm text-slate-200">
                还没有成员，邀请第一位管理员吧。
              </CardContent>
            </Card>
          </li>
        )}
      </ul>
    </div>
  );
}
