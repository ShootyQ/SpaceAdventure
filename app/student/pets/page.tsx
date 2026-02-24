import { redirect } from "next/navigation";

export default function StudentPetsRoute() {
    redirect("/student/settings?view=avatar-config");
}
