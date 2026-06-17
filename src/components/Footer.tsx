// src/components/Footer.tsx

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              UTLearning
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Learn online, improve your skills, and build your future.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Quick Links
            </h3>

            <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900">
                Home
              </Link>
              <Link href="/courses" className="hover:text-gray-900">
                Courses
              </Link>
              <Link href="/profile" className="hover:text-gray-900">
                Profile
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Contact
            </h3>

            <p className="mt-3 text-sm text-gray-600">
              Email: 22110223@student.hcmute.edu.vn (Mr. Tan Bui) <br />
              Email: 22110233@student.hcmute.edu.vn (Mr. Than Nguyen)
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Ho Chi Minh City, Vietnam
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} UTLearning. All rights reserved.
        </div>
      </div>
    </footer>
  );
}