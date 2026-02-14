import { redirect } from "next/navigation";

export default function LegacyStartRedirect() {
  redirect("/login");
}
