import { redirect } from "next/navigation";

export default function StudentHangarRoute() {
    redirect("/student/settings?view=ship");
}
