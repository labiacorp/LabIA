import { describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/session",()=>({requireUserId:async()=>"owner"}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{asset:{findFirst:mocks.find},influencer:{updateMany:mocks.update}}}));
import {saveInfluencer} from "./profile-actions";
describe("selected reference ownership",()=>{
 it("rejects foreign, unfinished or unrelated portraits before changing the profile",async()=>{const f=new FormData();for(const[k,v]of Object.entries({name:"Ana",niche:"QA",tone:"Claro",persona:"",visualSignature:"",faceAssetId:"foreign"}))f.set(k,v);mocks.find.mockResolvedValue(null);expect((await saveInfluencer("character",{error:"",message:""},f)).error).toContain("retrato pronto");expect(mocks.update).not.toHaveBeenCalled();expect(mocks.find.mock.calls[0][0].where).toMatchObject({id:"foreign",userId:"owner",influencerId:"character",role:"FRONT",kind:"IMAGE",step:{status:{in:["DONE","APPROVED"]}}});});
});
