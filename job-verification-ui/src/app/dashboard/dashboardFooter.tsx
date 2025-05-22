import { CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { jobOptions } from '../job'

type Props = {
    page: number;
    limit: number;
    setPage: (page: number) => void;
}
const DashboardFooter = ({
    page,
    limit,
    setPage,
}: Props) => {
    const {data, error} = useSuspenseQuery(jobOptions(page, limit))
    const isLoading = !data && !error
    const isError = error instanceof Error
    const handlePreviousPage = () => {
        if (page > 1) {
          setPage(page - 1);
        }
      };
      
      const handleNextPage = () => {
        if (data && page < data.meta.totalPages) {
          setPage(page + 1);
        }
      };
  return (
    <div>
        {data && data.meta.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.meta.page} of {data.meta.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page >= data.meta.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
    </div>
  )
}

export default DashboardFooter