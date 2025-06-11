import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Define status colors and backgrounds
  const getStatusStyles = (status: string) => {
    switch (status) {
      case "Unassigned":
        return {
          bg: "bg-neutral-100",
          text: "text-neutral-700",
        };
      case "Assigned":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
        };
      case "In Progress":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
        };
      case "Completed":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
        };
      case "In-Complete":
      case "Incomplete":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
        };
      case "Submit-Review":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
        };
      case "Review_Accepted":
        return {
          bg: "bg-lime-100",
          text: "text-lime-700",
        };
      case "Review_Reject":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
        };
      case "Review_inprogress":
        return {
          bg: "bg-sky-100",
          text: "text-sky-700",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
        };
    }
  };

  const { bg, text } = getStatusStyles(status);

  // Format the status for display
  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        bg,
        text,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
