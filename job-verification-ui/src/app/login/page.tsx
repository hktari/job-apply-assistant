
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Job Verification Dashboard</CardTitle>
          <CardDescription>Sign in to verify job postings</CardDescription>
        </CardHeader>
        <CardContent>
         
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-500">
            Demo credentials: admin / password
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
