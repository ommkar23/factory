import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@factory/ui";

import type { AppDirectoryEntry } from "../lib/app-directory";

type AppDirectoryProps = Readonly<{
  apps: readonly AppDirectoryEntry[];
}>;

export function AppDirectory({ apps }: AppDirectoryProps) {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10 text-foreground sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="max-w-2xl space-y-3">
          <Badge variant="outline">Factory</Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Factory Home
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Choose an application to continue.
            </p>
          </div>
        </header>

        <nav aria-label="Applications">
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {apps.map((app) => (
              <li key={app.id} className="min-w-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <h2 className="break-words">{app.name}</h2>
                    </CardTitle>
                    <CardDescription className="break-words">
                      {app.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a
                      aria-label={`Open ${app.name}`}
                      className={buttonVariants({
                        className: "w-full sm:w-auto",
                        size: "lg",
                      })}
                      href={app.href}
                    >
                      Open {app.name}
                    </a>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
