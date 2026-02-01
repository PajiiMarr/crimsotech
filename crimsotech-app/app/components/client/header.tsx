import { useState, useEffect } from "react";
import { Link } from "react-router";

export function Header() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const controlHeader = () => {
    if (typeof window !== "undefined") {
      if (window.scrollY > lastScrollY) {
        setShow(false);
        setMenuOpen(false);
      } else {
        setShow(true);
      }
      setLastScrollY(window.scrollY);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", controlHeader);
    return () => window.removeEventListener("scroll", controlHeader);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed top-0 w-full bg-white/20 backdrop-blur-xl shadow-md
      transition-transform duration-300 z-50
      ${show ? "translate-y-0" : "-translate-y-full"}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="w-14 h-14">
            <img
              src="Crimsotech.png"
              alt="crimsotech"
              className="w-full h-full object-contain"
            />
          </Link>
          <p className="font-semibold text-lg">CrimsoTech</p>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2 text-lg">
          <Link to="/" className="hover:text-orange-500 px-3 py-2">
            Home
          </Link>
          <Link to="/about" className="hover:text-orange-500 px-3 py-2">
            About us
          </Link>
          <Link to="/" className="hover:text-orange-500 px-3 py-2">
            Services
          </Link>
          <Link to="/" className="hover:text-orange-500 px-3 py-2">
            Volunteer
          </Link>
          <Link to="/riders" className="hover:text-orange-500 px-3 py-2">
            Be a Rider
          </Link>

          <Link
            to="/login"
            className="ml-2 rounded-xl bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
          >
            Shop Now
          </Link>
        </nav>

        {/* Mobile Burger Button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/30"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className="relative w-7 h-6">
            {/* top line */}
            <span
              className={`absolute left-0 top-0 h-0.5 w-full bg-black transition-all duration-300
              ${menuOpen ? "top-2.5 rotate-45" : "rotate-0"}`}
            />
            {/* middle line */}
            <span
              className={`absolute left-0 top-2.5 h-0.5 w-full bg-black transition-all duration-300
              ${menuOpen ? "opacity-0 translate-x-2" : "opacity-100 translate-x-0"}`}
            />
            {/* bottom line */}
            <span
              className={`absolute left-0 bottom-0 h-0.5 w-full bg-black transition-all duration-300
              ${menuOpen ? "bottom-2.5 -rotate-45" : "rotate-0"}`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Dropdown (slide down) */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out
        ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 pb-4">
          <div
            className={`flex flex-col gap-2 rounded-2xl bg-white/30 backdrop-blur-xl p-3 shadow
            transition-transform duration-300 ease-in-out
            ${menuOpen ? "translate-y-0" : "-translate-y-3"}`}
          >
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="hover:text-orange-500 px-3 py-2 rounded-xl hover:bg-white/30"
            >
              Home
            </Link>
            <Link
              to="/about"
              onClick={() => setMenuOpen(false)}
              className="hover:text-orange-500 px-3 py-2 rounded-xl hover:bg-white/30"
            >
              About us
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="hover:text-orange-500 px-3 py-2 rounded-xl hover:bg-white/30"
            >
              Services
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="hover:text-orange-500 px-3 py-2 rounded-xl hover:bg-white/30"
            >
              Volunteer
            </Link>
            <Link
              to="/riders"
              onClick={() => setMenuOpen(false)}
              className="hover:text-orange-500 px-3 py-2 rounded-xl hover:bg-white/30"
            >
              Be a Rider
            </Link>

            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-2 rounded-xl bg-orange-500 px-4 py-2 text-white text-center hover:bg-orange-600"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
