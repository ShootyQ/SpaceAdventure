import { redirect } from "next/navigation";

export default function LegacySpaceLoginRedirect() {
  redirect("/login");
}
