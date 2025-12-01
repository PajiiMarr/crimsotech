import { Card, CardContent, CardTitle } from "~/components/ui/card"

interface ProductCategoryProps {
  title: string
  image: string
}



export function ProductCategory({ title, image }: ProductCategoryProps) {
  return (
    <Card className="w-32 h-32 flex flex-col items-center justify-center p-2 rounded-full border border-gray-100 bg-white shadow-sm hover:shadow-md cursor-pointer transition-shadow">
      <CardContent className="flex flex-col items-center justify-center p-0 gap-2">
        <div className="w-14 h-14 rounded-full overflow-hidden">
          <img src="/public/phon.jpg" alt={title} className="w-full h-full object-cover" />
        </div>
        <CardTitle className="text-xs sm:text-sm text-center font-medium truncate">
          {title}
        </CardTitle>
      </CardContent>
    </Card>
  )
}
