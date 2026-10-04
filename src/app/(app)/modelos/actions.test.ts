import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),upsert:vi.fn(),remove:vi.fn()}));
vi.mock("@/lib/session",()=>({requireUserId:async()=>"owner"}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{content:{findFirst:mocks.find},contentTemplate:{upsert:mocks.upsert,deleteMany:mocks.remove}}}));
import {saveTemplate,deleteTemplate} from "./actions";
describe("owned template snapshots",()=>{
 beforeEach(()=>vi.resetAllMocks());
 it("refuses missing/foreign productions",async()=>{mocks.find.mockResolvedValue(null);expect((await saveTemplate("foreign",{error:"",message:""})).error).toBeTruthy();expect(mocks.find.mock.calls[0][0].where.influencer).toEqual({userId:"owner"});expect(mocks.upsert).not.toHaveBeenCalled()});
 it("copies only reusable text, deduplicates by source and scopes deletion",async()=>{mocks.find.mockResolvedValue({title:"Demo",idea:"Brief",aspectRatio:"9:16",steps:[{input:{script:"Words",requestId:"private"}}]});await saveTemplate("source",{error:"",message:""});expect(mocks.upsert.mock.calls[0][0].create).toEqual({userId:"owner",sourceContentId:"source",name:"Demo",title:"Demo",idea:"Brief",script:"Words",aspectRatio:"9:16"});await deleteTemplate("id","");expect(mocks.remove).toHaveBeenCalledWith({where:{id:"id",userId:"owner"}})});
});
