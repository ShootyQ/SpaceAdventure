import { redirect } from "next/navigation";

export default function StudentAvatarRoute() {
    redirect("/student/settings?view=avatar");
}
