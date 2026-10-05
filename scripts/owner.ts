// Owner accounts: grant, revoke or list (see src/lib/owner.ts for what the role unlocks).
// Only from this terminal, never from the UI or an env var. The account must exist (sign in once first).
//   npx tsx scripts/owner.ts list
//   npx tsx scripts/owner.ts grant <email>
//   npx tsx scripts/owner.ts revoke <email>
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const [command, arg] = process.argv.slice(2);
  if (command === "list") {
    for (const user of await prisma.user.findMany({ where: { role: "OWNER" }, select: { email: true, createdAt: true } }))
      console.log(`${user.email}  (desde ${user.createdAt.toISOString().slice(0, 10)})`);
  } else if (command === "grant" || command === "revoke") {
    const role = command === "grant" ? "OWNER" : "USER";
    const user = await prisma.user.findUnique({ where: { email: (arg ?? "").trim().toLowerCase() } });
    if (!user) throw new Error(`No user with e-mail ${arg}. They need to sign in once first.`);
    await prisma.$transaction([
      // Granting also confirms the address: whoever runs this has the production database and is
      // vouching for the account (needed while e-mail is off and no link can be mailed).
      prisma.user.update({ where: { id: user.id }, data: { role, ...(role === "OWNER" && !user.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}) } }),
      prisma.adminAction.create({ data: { action: command === "grant" ? "ROLE_GRANT" : "ROLE_REVOKE", targetUserId: user.id, data: { via: "scripts/owner.ts" } } }),
    ]);
    console.log(`${user.email}: ${role}`);
  } else {
    console.log("usage: list | grant <email> | revoke <email>");
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
