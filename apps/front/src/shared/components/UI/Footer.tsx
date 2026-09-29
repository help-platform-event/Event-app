import { GithubIcon, LinkedinIcon } from './icons/icons';

export default function Footer() {
    return (
        <footer className="w-full py-8 flex flex-col items-center justify-center gap-3 border-t border-base-300">
            {/* Branding */}
            <div className="flex flex-col items-center gap-1 text-center">
                <p className="font-semibold text-sm">Built by Maxime Tavares</p>

                <p className="text-xs opacity-60">
                    React • TypeScript • NestJS • Java 21 • Spring Boot
                </p>

                <p className="text-xs opacity-60">
                    Kafka • WebSocket (STOMP) • SSE • MySQL • Docker
                </p>

                <p className="text-[11px] opacity-40">Event management system</p>
            </div>

            {/* Social */}
            <div className="flex gap-3">
                <a
                    href="https://www.linkedin.com/in/maxime-tavares/"
                    className="mt-2 hover:opacity-70 transition"
                >
                    <LinkedinIcon size={28} />
                </a>
                <a
                    href="https://github.com/MaximeTavares/Event-app"
                    className="mt-2 hover:opacity-70 transition"
                >
                    <GithubIcon size={28} />
                </a>
            </div>

            {/* Copyright */}
            <p className="text-[11px] opacity-40">
                © {new Date().getFullYear()} — All rights reserved
            </p>
        </footer>
    );
}
