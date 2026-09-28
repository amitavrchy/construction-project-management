import { FolderOpen } from "lucide-react";
export function Empty({
  title = "A clean slate, ready for progress",
  text = "Add your first record to bring this part of your project to life.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FolderOpen size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
