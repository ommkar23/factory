import { Button, type StatusMessageProps } from "@factory/ui";
import { Spinner } from "@factory/ui/components/spinner";

const publicComponents = { Button, Spinner };

const statusMessage: StatusMessageProps = {
  children: "Consumer contract fixture",
  tone: "info",
};

void publicComponents;
void statusMessage;
