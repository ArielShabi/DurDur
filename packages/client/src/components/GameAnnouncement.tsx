import { useEffect, useState } from "react";

interface GameAnnouncementProps {
  /** Pass a new object (with a unique `id`) each time to trigger a new announcement. */
  announcement: { message: string; id: number } | null;
  /** Duration in ms before the message auto-dismisses (default 3000) */
  duration?: number;
}

export function GameAnnouncement({ announcement, duration = 3000 }: GameAnnouncementProps) {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!announcement) return;

    setText(announcement.message);
    setVisible(true);

    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [announcement, duration]);

  if (!text) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        dir="rtl"
        className={`announcement ${visible ? "announcement-enter" : "announcement-exit"}`}
        onAnimationEnd={() => {
          if (!visible) setText(null);
        }}
      >
        {text}
      </div>
    </div>
  );
}
