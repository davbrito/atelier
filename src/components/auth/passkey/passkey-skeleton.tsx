import { Item, ItemContent, ItemMedia } from "#/components/ui/item.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";

export function PasskeySkeleton() {
  return (
    <Item>
      <ItemMedia>
        <Skeleton className="size-10 rounded-md" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-32" />
      </ItemContent>
    </Item>
  );
}
