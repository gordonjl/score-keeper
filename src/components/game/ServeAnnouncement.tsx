type ServeAnnouncementProps = {
  announcement: string
}

export const ServeAnnouncement = ({ announcement }: ServeAnnouncementProps) => (
  <div className="alert mb-4">
    <span className="font-medium">{announcement}</span>
  </div>
)
