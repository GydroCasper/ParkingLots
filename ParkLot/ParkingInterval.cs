using System;
using System.Runtime.Serialization;

namespace ParkLot
{
    [DataContract]
    public class ParkingInterval
    {
        //[DataMember(Name = "id")]
        //public int Id;

        [DataMember(Name = "arrivalTime")]
        public string ArrivalTime;

        [DataMember(Name = "leaveTime")]
        public string LeaveTime;
    }
}
