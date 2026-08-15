import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
} from "@factory/ui";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-6">
        <header className="flex min-w-0 flex-col gap-2">
          <Badge variant="outline">Development baseline</Badge>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              Photo Feed
            </h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              A small, shared-UI baseline for local development.
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <div className="min-w-0">
              <h2 id="photo-feed-current-state" className="text-lg font-medium">
                Current state
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The application shell is ready for the next product milestone.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Alert aria-labelledby="photo-feed-current-state" role="region">
              <AlertTitle>Nothing to configure yet</AlertTitle>
              <AlertDescription>
                No photo feed is connected yet. This screen only confirms that
                the application and shared interface package are available for
                local development.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
