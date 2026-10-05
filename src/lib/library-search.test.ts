import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";
import { libraryWhere, parseLibraryFilters } from "./library";
const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({where:{id:{in:ids}}}); });
it("finds imported filenames without returning matching files from another account", async () => {
  const owner = await prisma.user.create({data:{email:`library-search-${randomUUID()}@example.com`}});
  ids.push(owner.id);
  const other = await prisma.user.create({data:{email:`library-foreign-${randomUUID()}@example.com`}});
  ids.push(other.id);
  const asset = await prisma.asset.create({data:{userId:owner.id,kind:"IMAGE",url:"/mock/portrait.svg",fileName:"Retrato-Abril.webp"}});
  await prisma.asset.create({data:{userId:other.id,kind:"IMAGE",url:"/mock/portrait.svg",fileName:"Retrato-Abril.webp"}});
  const matches = await prisma.asset.findMany({where:libraryWhere(owner.id,parseLibraryFilters({q:"retrato-abril"})),select:{id:true}});
  expect(matches.map(item => item.id)).toEqual([asset.id]);
});
