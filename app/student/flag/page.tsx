import { redirect } from "next/navigation";

export default function StudentFlagRoute() {
    redirect("/student/settings?view=flag");
}
