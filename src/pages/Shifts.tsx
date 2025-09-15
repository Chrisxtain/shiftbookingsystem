import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { Clock, Users, MapPin } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  shift_type: string;
  is_active: boolean;
}

interface ShiftBooking {
  id: string;
  shift_id: string;
  shift_date: string;
  status: string;
  shifts: Shift;
}

const Shifts = () => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<ShiftBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShifts();
    fetchBookings();
  }, []);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shift_bookings')
        .select(`
          *,
          shifts (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const bookShift = async (shiftId: string) => {
    if (!user) return;

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    // Check if already booked
    const existingBooking = bookings.find(
      booking => 
        booking.shift_id === shiftId && 
        booking.shift_date === selectedDateStr
    );

    if (existingBooking) {
      toast.error('You have already booked this shift for the selected date');
      return;
    }

    try {
      const { error } = await supabase
        .from('shift_bookings')
        .insert({
          user_id: user.id,
          shift_id: shiftId,
          shift_date: selectedDateStr,
          status: 'booked'
        });

      if (error) throw error;

      toast.success('Shift booked successfully!');
      fetchBookings(); // Refresh bookings
    } catch (error) {
      console.error('Error booking shift:', error);
      toast.error('Failed to book shift');
    }
  };

  const getShiftTypeColor = (type: string) => {
    const colors = {
      'morning': 'bg-primary/10 text-primary',
      'afternoon': 'bg-secondary/10 text-secondary-foreground',
      'evening': 'bg-accent/10 text-accent-foreground',
      'night': 'bg-muted/10 text-muted-foreground'
    };
    return colors[type as keyof typeof colors] || 'bg-muted/10 text-muted-foreground';
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading shifts...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Available Shifts</h1>
          <p className="text-muted-foreground">Select a date and book your shifts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="rounded-md border pointer-events-auto"
                />
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Selected Date:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate.toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shifts */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {shifts.map((shift) => {
                const isBooked = bookings.some(
                  booking => 
                    booking.shift_id === shift.id && 
                    booking.shift_date === selectedDate.toISOString().split('T')[0]
                );

                return (
                  <Card key={shift.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{shift.name}</CardTitle>
                        <Badge className={getShiftTypeColor(shift.shift_type)}>
                          {shift.shift_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{shift.duration_hours} hours</span>
                      </div>

                      <Button 
                        onClick={() => bookShift(shift.id)}
                        disabled={isBooked}
                        className="w-full"
                        variant={isBooked ? "secondary" : "default"}
                      >
                        {isBooked ? "Already Booked" : "Book Shift"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {shifts.length === 0 && (
              <Card className="p-8 text-center">
                <CardDescription>
                  No shifts available at the moment. Check back later!
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shifts;