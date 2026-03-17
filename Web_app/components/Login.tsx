import { SignIn } from '@clerk/nextjs';

export default function Login() {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-6 bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl flex flex-col items-center">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome to Eva</h2>
                    <p className="text-zinc-400 text-sm">Please sign in to access the core interface.</p>
                </div>

                <SignIn
                    appearance={{
                        elements: {
                            card: "bg-transparent shadow-none w-full",
                            headerTitle: "hidden",
                            headerSubtitle: "hidden",
                            socialButtonsBlockButton: "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
                            formButtonPrimary: "bg-emerald-500 hover:bg-emerald-400 text-zinc-950",
                            formFieldInput: "bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500 focus:ring-emerald-500",
                            formFieldLabel: "text-zinc-400",
                            footerActionText: "text-zinc-500",
                            footerActionLink: "text-emerald-500 hover:text-emerald-400",
                            dividerLine: "bg-zinc-800",
                            dividerText: "text-zinc-500",
                            identityPreviewText: "text-zinc-300",
                            identityPreviewEditButton: "text-emerald-500 hover:text-emerald-400"
                        }
                    }}
                    routing="hash"
                />
            </div>
        </div>
    );
}
