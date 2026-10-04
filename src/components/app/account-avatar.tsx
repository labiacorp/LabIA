"use client";
export function AccountAvatar({
  name,
  version,
  large = false,
}: {
  name: string;
  version?: number;
  large?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-lab-surface-2 font-semibold ${large ? "size-24 text-2xl" : "size-10 text-caption"}`}
    >
      <span aria-hidden>{initials || "L"}</span>
      {version ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={version}
          src={`/api/account/avatar?v=${version}`}
          alt="Sua foto de perfil"
          width={256}
          height={256}
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}
