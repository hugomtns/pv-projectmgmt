import { useDisplayStore } from '@/stores/displayStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ViewType, GroupingOption, BoardColumns, BoardRows } from '@/lib/types';

export function DisplayPopover() {
  const { settings, setView, updateListSettings, updateBoardSettings } = useDisplayStore();

  const handleViewChange = (view: ViewType) => {
    setView(view);
  };

  const handleListGroupingChange = (grouping: GroupingOption) => {
    updateListSettings({ grouping });
  };

  const handleBoardColumnsChange = (columns: BoardColumns) => {
    updateBoardSettings({ columns });
  };

  const handleBoardRowsChange = (rows: BoardRows) => {
    updateBoardSettings({ rows });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">View</h4>
            <Tabs value={settings.view} onValueChange={(v) => handleViewChange(v as ViewType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="board">Board</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {settings.view === 'list' && (
            <div>
              <h4 className="font-medium text-sm mb-2">Group by</h4>
              <div className="flex flex-wrap gap-2">
                {(['none', 'stage', 'priority', 'owner'] as GroupingOption[]).map((option) => (
                  <Badge
                    key={option}
                    variant={settings.list.grouping === option ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => handleListGroupingChange(option)}
                  >
                    {option === 'none' ? 'None' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {settings.view === 'board' && (
            <>
              <div>
                <h4 className="font-medium text-sm mb-2">Columns</h4>
                <div className="flex flex-wrap gap-2">
                  {(['stage', 'priority'] as BoardColumns[]).map((option) => (
                    <Badge
                      key={option}
                      variant={settings.board.columns === option ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleBoardColumnsChange(option)}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Rows</h4>
                <div className="flex flex-wrap gap-2">
                  {(['none', 'priority', 'owner'] as BoardRows[]).map((option) => (
                    <Badge
                      key={option}
                      variant={settings.board.rows === option ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleBoardRowsChange(option)}
                    >
                      {option === 'none' ? 'None' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
