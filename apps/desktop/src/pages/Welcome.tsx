import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 overflow-hidden">
      <img src="/logo.png" alt="Sunless Logo" className="w-20 h-20 mb-8" />

      <h1 className="text-4xl font-semibold text-center mb-8 leading-tight">
        Your voice echoes
        <br />
        into light
      </h1>

      <div className="flex flex-col gap-4 w-72 mb-8">
        <Link to="/signin">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base">
            Sign In
          </Button>
        </Link>

        <Link to="/signup">
          <Button
            variant="outline"
            className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white py-3 text-base"
          >
            Sign Up
          </Button>
        </Link>
      </div>

      <div className="text-sm opacity-70 text-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="mr-2" />I agree to the Terms of
          Service and Privacy Policy
        </label>
      </div>
    </div>
  );
}

export default Welcome;
