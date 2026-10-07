import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks=vi.hoisted(()=>({find:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{user:{findUnique:mocks.find}}}));
import { GET } from "./route";
describe("referral landing",()=>{
 it("records a valid first touch as a private bounded cookie without bypassing login",async()=>{mocks.find.mockResolvedValue({id:"owner"});const code="a".repeat(32);const response=await GET(new NextRequest(`https://labia.test/r/${code}`),{params:Promise.resolve({code})});expect(response.headers.get("location")).toBe("https://labia.test/criar-conta");expect(response.cookies.get("labia_referral")).toMatchObject({value:code,httpOnly:true,maxAge:2592000,sameSite:"lax",path:"/"});expect(response.cookies.get("labia_access")).toBeUndefined();});
 it("preserves the first link and rejects invalid links",async()=>{const code="b".repeat(32);mocks.find.mockResolvedValue({id:"owner"});const response=await GET(new NextRequest(`https://labia.test/r/${code}`,{headers:{cookie:`labia_referral=${"a".repeat(32)}`}}),{params:Promise.resolve({code})});expect(response.cookies.get("labia_referral")).toBeUndefined();const invalid=await GET(new NextRequest("https://labia.test/r/invalid"),{params:Promise.resolve({code:"invalid"})});expect(invalid.headers.get("location")).toBe("https://labia.test/criar-conta");expect(invalid.cookies.get("labia_referral")).toBeUndefined();});
});
