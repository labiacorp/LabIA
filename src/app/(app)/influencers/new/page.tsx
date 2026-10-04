import { redirect } from "next/navigation";

export default function NewInfluencerPage() {
  redirect("/?criar=1#studio-builder");
}
