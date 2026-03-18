import AdminBlogEditPage from "@/components/admin/blog/AdminBlogEditPage";

export default function AdminBlogEditRoute({ params }: { params: Promise<{ id: string }> }) {
  return <AdminBlogEditPage params={params} />;
}
