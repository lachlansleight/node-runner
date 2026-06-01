import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" type="submit">
        Log out
      </Button>
    </form>
  );
}
